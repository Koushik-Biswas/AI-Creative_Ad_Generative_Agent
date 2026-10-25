"""FastAPI implementation of the dashboard contract. Run behind the authenticated Site gateway."""
import asyncio
import copy as deep_copy
import hmac
import io
import json
import os
import re
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from urllib.parse import urlsplit
import httpx
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from pydantic import ValidationError, TypeAdapter
from . import agent, research, storage
from .models import CampaignSettings, Profile, Competitor, Evidence, Concept, Creative, Rewrite, Suggestions, ReportResult, BriefResult, CopyResult, PLATFORMS, SPECS
from .renderer import render, quality

def uid():
    return str(uuid.uuid4())

@asynccontextmanager
async def lifespan(app):
    token = os.getenv('SERVICE_TOKEN', '')
    if len(token) < 32 and os.getenv('DEV_AUTH') != '1':
        raise RuntimeError('SERVICE_TOKEN must be at least 32 characters. DEV_AUTH=1 is only for isolated local testing.')
    storage.initialize()
    yield

app = FastAPI(title='Signal Studio API', version='1.0.0', lifespan=lifespan, docs_url='/docs' if os.getenv('DEV_AUTH')=='1' else None, redoc_url=None)

@app.middleware('http')
async def secure(request, call_next):
    if request.url.path.startswith('/api/') and request.url.path != '/api/health':
        secret = os.getenv('SERVICE_TOKEN', '')
        valid = bool(secret) and hmac.compare_digest(request.headers.get('x-service-token', ''), secret)
        dev = os.getenv('DEV_AUTH') == '1'
        owner = request.headers.get('x-user-id', '') if valid else ('local-qa' if dev else '')
        if not owner:
            return JSONResponse({'error': 'Authenticated gateway credentials required'}, status_code=401)
        request.state.owner = owner[:200]
    if int(request.headers.get('content-length', '0') or 0) > 6*1024*1024:
        return JSONResponse({'error': 'Request exceeds the 6 MB limit'}, status_code=413)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

@app.exception_handler(HTTPException)
async def http_error(request, error):
    return JSONResponse({'error': error.detail}, status_code=error.status_code)

@app.exception_handler(ValidationError)
@app.exception_handler(RequestValidationError)
async def validation_error(request, error):
    return JSONResponse({'error': 'Please check the form fields.', 'details': ['.'.join(map(str,e['loc']))+': '+e['msg'] for e in error.errors()][:8]}, status_code=400)

@app.exception_handler(Exception)
async def unexpected_error(request, error):
    # Never log provider payloads, authorization headers or user assets.
    return JSONResponse({'error': 'This operation could not complete. Refresh or retry; saved work is safe.'}, status_code=500)

async def body(request):
    raw = await request.body()
    if len(raw) > 700000:
        raise HTTPException(413, 'Request too large')
    try:
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except ValueError:
        raise HTTPException(400, 'Invalid JSON request') from None

def validate_evidence(e):
    u = urlsplit(e['sourceUrl'])
    host = (u.hostname or '').lower()
    valid = u.scheme=='https' and not u.username and not u.password and (
        host=='adstransparency.google.com' or
        host in ('facebook.com','www.facebook.com') and u.path.startswith('/ads/library') or
        host in ('linkedin.com','www.linkedin.com') and u.path.startswith('/ad-library'))
    expected = 'google' if 'google' in host else 'meta' if 'facebook' in host else 'linkedin'
    if not valid or e['platform'] != expected:
        raise HTTPException(400, 'Evidence must match the selected platform and link to an official public ad library.')

def rate_limit(owner):
    minute = int(time.time()//60)
    key = f'{owner}:{minute}'
    with storage.db() as con:
        row = con.execute('INSERT INTO usage(id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count', (key,)).fetchone()
        con.execute('DELETE FROM usage WHERE id LIKE ? AND id < ?', (f'{owner}:%',f'{owner}:{minute-5}'))
    if row['count']>18:
        raise HTTPException(429,'Too many agent requests. Try again in a minute.')

@app.get('/api/health')
async def health():
    return {'status':'ok','service':'signal-studio-python'}

@app.post('/api/auth/attempt')
async def auth_attempt(request: Request):
    value=await body(request)
    fingerprint=value.get('fingerprint','')
    if not isinstance(fingerprint,str) or not re.fullmatch(r'[a-f0-9]{64}',fingerprint):
        raise HTTPException(400,'Invalid sign-in fingerprint')
    bucket=int(time.time()//900)
    with storage.db() as con:
        counts=[]
        for key in (f'auth-global:{bucket}',f'auth-ip:{fingerprint}:{bucket}'):
            row=con.execute('INSERT INTO usage(id,count) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',(key,)).fetchone()
            counts.append(row['count'])
        con.execute("DELETE FROM usage WHERE id LIKE 'auth-global:%' AND id <> ?",(f'auth-global:{bucket}',))
    if counts[0]>30 or counts[1]>8:
        raise HTTPException(429,'Too many sign-in attempts. Wait 15 minutes.')
    return {'allowed':True}

@app.get('/api/bootstrap')
async def bootstrap(request: Request):
    with storage.db() as con:
        rows = con.execute('SELECT data,revision FROM projects WHERE owner=? ORDER BY updated DESC LIMIT 100',(request.state.owner,)).fetchall()
    return {'projects':[{**json.loads(r['data']),'revision':r['revision']} for r in rows], 'user':{'name':'Koushik'}, 'capabilities':{
        'llm':bool(os.getenv('GROQ_API_KEY')), 'model':os.getenv('GROQ_MODEL','openai/gpt-oss-120b'),
        'adCollection':bool(os.getenv('AD_LIBRARY_API_URL')), 'renderer':'SVG/browser canvas + Python Pillow',
        'runtime':'Python FastAPI · SQLite WAL · persistent disk'}}

@app.post('/api/projects', status_code=201)
async def create_project(request: Request, settings: CampaignSettings):
    p = settings.model_dump()
    if not p['website'] and not p['description']:
        raise HTTPException(400,'Provide a website or business description.')
    p.update(id=uid(), revision=1, profile=None, sources=[], competitors=[], competitorsConfirmed=False, evidence=[], report=None, concepts=[], creatives=[], contexts=[], assets=[], logoId='', activities=[{'text':'Campaign created','at':storage.now()}], updatedAt=storage.now())
    with storage.db() as con:
        count = con.execute('SELECT COUNT(*) FROM projects WHERE owner=?',(request.state.owner,)).fetchone()[0]
        if count>=100:
            raise HTTPException(400,'Workspace limit: 100 campaigns.')
        con.execute('INSERT INTO projects(id,owner,title,data,revision,updated) VALUES (?,?,?,?,?,?)',(p['id'],request.state.owner,p['title'],json.dumps(p),1,p['updatedAt']))
    return p

@app.get('/api/projects/{project_id}')
async def get_project(project_id: str, request: Request):
    return storage.read(project_id,request.state.owner)

def validate_colors(profile):
    if not all(re.fullmatch(r'#[a-fA-F0-9]{6}',c) for c in profile['colors']):
        raise HTTPException(400,'Brand colours must use six-digit hex values.')

@app.patch('/api/projects/{project_id}')
async def patch_project(project_id: str, request: Request):
    owner=request.state.owner;p=storage.read(project_id,owner);patch=await body(request)
    allowed=set(CampaignSettings.model_fields)|{'revision','profile','competitors','competitorsConfirmed','evidence','concepts','creatives','logoId'}
    if set(patch)-allowed:
        raise HTTPException(400,'Unknown campaign field')
    if patch.get('revision') != p['revision']:
        raise HTTPException(409,'Campaign changed. Refresh and retry.')
    values=CampaignSettings.model_validate({k:patch.get(k,p[k]) for k in CampaignSettings.model_fields}).model_dump()
    if 'profile' in patch and patch['profile'] is not None:
        profile=Profile.model_validate(patch['profile']).model_dump();validate_colors(profile)
        for claim in profile['claims']:
            if claim['sourceId']!='manual' and not any(s['id']==claim['sourceId'] and claim['quote'] in s['text'] and claim['text'] in claim['quote'] for s in p['sources']):
                raise HTTPException(400,'Claim does not match its cited source.')
        patch['profile']=profile
    for field,model,max_length in [('competitors',Competitor,10),('evidence',Evidence,100),('concepts',Concept,30),('creatives',Creative,120)]:
        if field in patch:
            patch[field]=TypeAdapter(list[model]).validate_python(patch[field])
            patch[field]=[x.model_dump(exclude_none=True) for x in patch[field]]
            if len(patch[field])>max_length:
                raise HTTPException(400,f'Too many {field}')
    for e in patch.get('evidence',[]):
        validate_evidence(e)
    if patch.get('logoId') and not any(a['id']==patch['logoId'] and a['mime'].startswith('image/') for a in p['assets']):
        raise HTTPException(400,'Select an uploaded image from this campaign.')
    if 'competitorsConfirmed' in patch and not isinstance(patch['competitorsConfirmed'],bool):
        raise HTTPException(400,'Invalid competitor confirmation')
    for c in patch.get('creatives',[]):
        old=next((x for x in p['creatives'] if x['id']==c['id']),None)
        if not old:
            raise HTTPException(400,'Unknown creative')
        for key in ('width','height','platform','ratio','conceptId','createdAt','contextId'):
            if key in old:c[key]=old[key]
        changed=any(c[k]!=old[k] for k in ('headline','body','cta','color','style'))
        c['history']=old['history']
        c['version']=old['version']
        if changed:
            c['history']=(old['history']+[{k:old[k] for k in ('version','headline','body','cta','color','style','savedAt')}])[-30:]
            c.update(version=old['version']+1,savedAt=storage.now(),status='review')
    profile_changed='profile' in patch and patch['profile'] and {**patch['profile'],'confirmed':False}!={**(p['profile'] or {}),'confirmed':False}
    competitor_changed='competitors' in patch and patch['competitors']!=p['competitors']
    evidence_changed='evidence' in patch and patch['evidence']!=p['evidence']
    input_changed=any(k in patch and patch[k]!=p[k] for k in ('website','description','audience','language'))
    p.update(values);p.update(patch)
    if input_changed:
        if p['profile']:p['profile']['confirmed']=False
        p.update(competitorsConfirmed=False,report=None,concepts=[])
        for c in p['creatives']:c['status']='review'
    if profile_changed:
        for c in p['creatives']:c['status']='review'
    if profile_changed or competitor_changed:
        p.update(report=None,concepts=[],competitorsConfirmed=False)
    if evidence_changed:
        p.update(report=None,concepts=[])
    for c in p['creatives']:
        q=quality(c,p)
        if c['status']=='approved' and (not q['dimensionsValid'] or any(q[k] for k in ('unverifiedNumbers','excludedWords','competitorNames','copiedHeadline'))):
            raise HTTPException(400,'Resolve creative quality errors before approval.')
    return storage.save(p,owner)

@app.delete('/api/projects/{project_id}')
async def delete_project(project_id: str, request: Request):
    owner=request.state.owner;p=storage.read(project_id,owner)
    with storage.db() as con:
        con.execute('DELETE FROM assets WHERE project_id=? AND owner=?',(project_id,owner))
        con.execute('DELETE FROM projects WHERE id=? AND owner=?',(project_id,owner))
    for asset in p['assets']:
        (storage.data_root()/'uploads'/asset['id']).unlink(missing_ok=True)
    return {'deleted':True}

@app.post('/api/projects/{project_id}/assets')
async def upload(project_id: str, request: Request, file: UploadFile=File(...)):
    owner=request.state.owner;p=storage.read(project_id,owner)
    raw=await file.read(5*1024*1024+1)
    if len(raw)>5*1024*1024 or len(p['assets'])>=30:
        raise HTTPException(400,'Use a file up to 5 MB; maximum 30 assets per campaign.')
    valid={'image/png':raw.startswith(b'\x89PNG\r\n\x1a\n'),'image/jpeg':raw.startswith(b'\xff\xd8'), 'image/webp':raw.startswith(b'RIFF') and raw[8:12]==b'WEBP','application/pdf':raw.startswith(b'%PDF-')}
    if not valid.get(file.content_type):
        raise HTTPException(400,'Upload a valid PNG, JPG, WebP or PDF.')
    asset={'id':uid(),'name':(file.filename or 'asset')[:200],'mime':file.content_type,'size':len(raw)}
    folder=storage.data_root()/'uploads';folder.mkdir(exist_ok=True);path=folder/asset['id'];path.write_bytes(raw)
    with storage.db() as con:
        con.execute('INSERT INTO assets(id,owner,project_id,name,mime,size) VALUES (?,?,?,?,?,?)',(asset['id'],owner,project_id,asset['name'],asset['mime'],asset['size']))
    p['assets'].append(asset)
    if not p['logoId'] and file.content_type.startswith('image/'):
        p['logoId']=asset['id']
    try:
        return storage.save(p,owner,'Brand asset uploaded')
    except Exception:
        path.unlink(missing_ok=True)
        with storage.db() as con:
            con.execute('DELETE FROM assets WHERE id=?',(asset['id'],))
        raise

@app.get('/api/assets/{asset_id}')
async def asset(asset_id: str, request: Request):
    with storage.db() as con:
        a=con.execute('SELECT * FROM assets WHERE id=? AND owner=?',(asset_id,request.state.owner)).fetchone()
    if not a:
        raise HTTPException(404,'Asset not found')
    path=storage.data_root()/'uploads'/a['id']
    if not path.is_file():
        raise HTTPException(404,'Asset not found')
    return Response(path.read_bytes(),media_type=a['mime'],headers={'Content-Security-Policy':"default-src 'none'"})

@app.post('/api/projects/{project_id}/{action}')
async def agent_action(project_id: str, action: str, request: Request):
    owner=request.state.owner;p=storage.read(project_id,owner);rate_limit(owner)
    if action=='research':
        sources,colors=await research.acquire(p)
        if os.getenv('GROQ_API_KEY'):
            profile=await agent.ask(Profile,'Extract the business profile using only the source data. Claims must be verbatim excerpts with an exact quote and sourceId. Return no claims when none are explicit. confirmed=false.',{'sources':sources,'palette':colors,'audience':p['audience'],'language':p['language']})
            profile['claims']=[c for c in profile['claims'] if any(s['id']==c['sourceId'] and c['quote'] in s['text'] and c['text'] in c['quote'] for s in sources)]
        else:
            profile={'name':p['title'],'description':p['description'] or sources[0]['text'][:800],'audience':p['audience'],'industry':'Review and classify','valueProps':[],'tone':'Clear and professional','colors':colors,'claims':[],'confirmed':False}
        validate_colors(profile);profile['confirmed']=False
        for c in p['creatives']:c['status']='review'
        p.update(profile=profile,sources=sources,competitorsConfirmed=False,report=None,concepts=[])
        return storage.save(p,owner,'Business research completed; awaiting confirmation')
    if action=='suggest-competitors':
        if not p['profile'] or not p['profile']['confirmed']:
            raise HTTPException(400,'Confirm the business profile first.')
        result=await agent.ask(Suggestions,'Suggest 3 to 5 direct, indirect and aspirational competitors. These are unverified suggestions from model knowledge, not live search. Use an empty URL when uncertain.',{'profile':p['profile'],'region':p['region']})
        p.update(competitors=[{**c,'id':uid(),'verified':False} for c in result['competitors']],competitorsConfirmed=False,report=None,concepts=[])
        return storage.save(p,owner,'Competitor suggestions ready for verification')
    if action=='insights':
        if not p['competitorsConfirmed']:
            raise HTTPException(400,'Confirm your competitor list first.')
        provider=os.getenv('AD_LIBRARY_API_URL','')
        if provider:
            if not provider.startswith('https://'):
                raise HTTPException(503,'Ad collector must use HTTPS.')
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    r=await client.post(provider,headers={'Authorization':'Bearer '+os.getenv('AD_LIBRARY_API_KEY','')},json={'competitors':p['competitors'],'platforms':p['platforms'],'region':p['region']})
                    r.raise_for_status()
                    ads=TypeAdapter(list[Evidence]).validate_python(r.json()['ads'])
                    if len(ads)>100: raise ValueError()
                    for e in ads:
                        ad=e.model_dump(exclude_none=True);validate_evidence(ad)
                        if not any(x['id']==ad['id'] for x in p['evidence']):p['evidence'].append(ad)
            except (httpx.HTTPError,ValueError,KeyError):
                raise HTTPException(502,'Ad collection failed. Import evidence manually or retry the provider.') from None
        coverage=[{'platform':platform,'status':'Imported evidence; coverage may be incomplete' if any(e['platform']==platform for e in p['evidence']) else 'No evidence collected; not a claim that no ads exist','count':sum(e['platform']==platform for e in p['evidence'])} for platform in PLATFORMS]
        if not p['evidence']:
            result={'summary':'No competitor ads have been collected. Import source-linked examples from official public ad libraries. Creative directions remain unvalidated hypotheses.','insights':[{'id':f'hypothesis-{i}','platform':platform,'pattern':'Insufficient evidence to establish competitor patterns','whitespace':'Test a clear benefit-led direction','rationale':'Business-led hypothesis; no competitor evidence.','evidenceIds':[]} for i,platform in enumerate(p['platforms'])]}
        else:
            result=await agent.ask(ReportResult,'Analyse only supplied ads. Observations need exact evidenceIds for that platform. Distinguish hypotheses from observed patterns. Visual notes are user observations, not unseen pixels. Longevity is not confirmed performance. Do not generalize market saturation from a small sample.',{'profile':p['profile'],'ads':p['evidence'],'language':p['language']})
            for insight in result['insights']:
                insight['evidenceIds']=[i for i in insight['evidenceIds'] if any(e['id']==i and e['platform']==insight['platform'] for e in p['evidence'])]
        p.update(report={**result,'coverage':coverage,'generatedAt':storage.now()},concepts=[])
        return storage.save(p,owner,'Competitor coverage and insights updated')
    if action=='brief':
        if not p['profile'] or not p['profile']['confirmed'] or not p['report']:
            raise HTTPException(400,'Confirm the business profile and create an insights report first.')
        result=await agent.ask(BriefResult,'Create exactly 3 distinct concepts for EACH selected platform. Headline max75, body max130, CTA max24 characters. approved=false. No numbers or unsupported proof. Use exact insightIds for the platform. Name unsupported directions as hypotheses. Avoid competitor wording. Respect excluded words and requested language.',{'profile':p['profile'],'report':p['report'],'platforms':p['platforms'],'goal':p['goal'],'avoid':p['avoid'],'region':p['region'],'language':p['language']})
        concepts=[]
        for c in result['concepts']:
            if c['platform'] not in p['platforms']: continue
            c.update(id=uid(),approved=False)
            c['insightIds']=[i for i in c['insightIds'] if any(x['id']==i and x['platform']==c['platform'] for x in p['report']['insights'])]
            c['claimIds']=[i for i in c['claimIds'] if any(s['id']==i for s in p['sources'])]
            concepts.append(c)
        if not concepts: raise HTTPException(502,'No concepts matched your selected platforms. Retry the brief.')
        p['concepts']=concepts
        return storage.save(p,owner,'Creative brief proposed; awaiting approval')
    if action=='generate':
        approved=[c for c in p['concepts'] if c['approved'] and c['platform'] in p['platforms']]
        if not p['profile'] or not p['profile']['confirmed'] or not approved:
            raise HTTPException(400,'Confirm the profile and approve at least one concept first.')
        count=sum(len([r for r in p['ratios'] if not(c['platform']=='linkedin' and r=='9:16')])*p['variations'] for c in approved)
        if len(p['creatives'])+count>120:
            raise HTTPException(400,'Campaign limit: 120 creatives. Duplicate inputs for another batch.')
        if len(p.get('contexts',[]))>=20:raise HTTPException(400,'Maximum 20 batches per campaign. Duplicate inputs for a new campaign.')
        context_id=uid()
        p.setdefault('contexts',[]).append({'id':context_id,'capturedAt':storage.now(),**deep_copy.deepcopy({k:p[k] for k in ('profile','report','concepts','sources','evidence')})})
        for concept in approved:
            for ratio in p['ratios']:
                if concept['platform']=='linkedin' and ratio=='9:16': continue
                for variation in range(p['variations']):
                    width,height=SPECS[ratio]
                    p['creatives'].append({'id':uid(),'conceptId':concept['id'],'contextId':context_id,'platform':concept['platform'],'ratio':ratio,'width':width,'height':height,'headline':concept['headline'],'body':concept['body'],'cta':concept['cta'],'color':p['profile']['colors'][variation%len(p['profile']['colors'])],'style':variation%4,'version':1,'status':'review','favorite':False,'history':[],'savedAt':storage.now(),'createdAt':storage.now()})
        return storage.save(p,owner,'Creative variations rendered and ready for review')
    if action=='rewrite':
        value=Rewrite.model_validate(await body(request))
        c=next((x for x in p['creatives'] if x['id']==value.creativeId),None)
        if not c:raise HTTPException(404,'Creative not found')
        copy=await agent.ask(CopyResult,'Revise copy based on feedback. Stay grounded in the profile. No unsupported claims. This changes copy only; layout and colours use direct controls.',{'profile':p['profile'],'current':c,'feedback':value.feedback,'avoid':p['avoid'],'language':p['language']})
        c['history']=(c['history']+[{k:c[k] for k in ('version','headline','body','cta','color','style','savedAt')}])[-30:]
        c.update(copy);c.update(version=c['version']+1,status='review',savedAt=storage.now())
        return storage.save(p,owner,'Creative revised from feedback')
    raise HTTPException(404,'Endpoint not found')

@app.get('/api/projects/{project_id}/render/{creative_id}.{file_type}')
async def render_creative(project_id: str, creative_id: str, file_type: str, request: Request):
    p=storage.read(project_id,request.state.owner)
    c=next((x for x in p['creatives'] if x['id']==creative_id),None)
    if not c or file_type not in ('png','jpg'):raise HTTPException(404,'Creative or format not found')
    logo=storage.data_root()/'uploads'/p['logoId'] if p['logoId'] else None
    raw=await asyncio.to_thread(render,c,p,file_type,logo)
    return Response(raw,media_type='image/png' if file_type=='png' else 'image/jpeg',headers={'Content-Disposition':f'attachment; filename="{creative_id}.{file_type}"'})

@app.get('/api/projects/{project_id}/export')
async def export_project(project_id: str, request: Request):
    p=storage.read(project_id,request.state.owner)
    approved=[c for c in p['creatives'] if c['status']=='approved']
    if not approved:raise HTTPException(400,'Approve a creative before exporting.')
    def package():
        output=io.BytesIO()
        with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
            for c in approved:
                for ext in ('png','jpg'):
                    logo=storage.data_root()/'uploads'/p['logoId'] if p['logoId'] else None
                    archive.writestr(f"{c['platform']}/{c['conceptId']}/{c['ratio'].replace(':','x')}-{c['id']}-v{c['version']}.{ext}",render(c,p,ext,logo))
            archive.writestr('ad-copy-and-checklist.json',json.dumps([{'id':c['id'],'headline':c['headline'],'primaryText':c['body'],'cta':c['cta'],'checks':quality(c,p)} for c in approved],indent=2))
            archive.writestr('research-and-provenance.json',json.dumps({k:p[k] for k in ('title','profile','sources','competitors','evidence','report','concepts','contexts')},indent=2))
        return output.getvalue()
    return Response(await asyncio.to_thread(package),media_type='application/zip',headers={'Content-Disposition':'attachment; filename="signal-campaign.zip"'})
