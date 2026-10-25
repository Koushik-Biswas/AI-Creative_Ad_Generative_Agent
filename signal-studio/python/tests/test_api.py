import asyncio
import io
import json
import socket
import zipfile
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app import agent, research
from app.models import BriefResult

TOKEN='test-service-token-with-at-least-32-characters'
HEADERS={'X-Service-Token':TOKEN,'X-User-Id':'owner-a'}

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('SERVICE_TOKEN',TOKEN)
    monkeypatch.setenv('DATA_DIR',str(tmp_path))
    monkeypatch.delenv('DEV_AUTH',raising=False)
    monkeypatch.delenv('GROQ_API_KEY',raising=False)
    monkeypatch.delenv('AD_LIBRARY_API_URL',raising=False)
    with TestClient(app) as c:
        c.headers.update(HEADERS)
        yield c

def update(client,p,**changes):
    r=client.patch('/api/projects/'+p['id'],json={'revision':p['revision'],**changes})
    assert r.status_code==200,r.text
    return r.json()

def create(client):
    r=client.post('/api/projects',json={'title':'Orion launch','description':'Orion is a project management workspace for business operations teams. It brings projects and priorities together so leaders can coordinate their work.','audience':'Operations leaders'})
    assert r.status_code==201,r.text
    return r.json()

def prepared(client):
    p=create(client)
    r=client.post('/api/projects/'+p['id']+'/research');assert r.status_code==200,r.text;p=r.json()
    p=update(client,p,profile={**p['profile'],'confirmed':True})
    p=update(client,p,competitors=[{'id':'comp','name':'Task Other','url':'https://example.com','type':'direct'}])
    p=update(client,p,competitorsConfirmed=True)
    r=client.post('/api/projects/'+p['id']+'/insights');assert r.status_code==200,r.text
    return r.json()

async def fake_ask(model,task,context):
    assert model is BriefResult
    return {'concepts':[{'id':'concept-'+platform,'platform':platform,'title':'Make space for focus','angle':'Benefit-led','headline':'Bring your work together','body':'A clearer workspace for operations teams.','cta':'Explore Orion','visual':'Original abstract forms','rationale':'A business-led hypothesis; competitor coverage is unavailable.','insightIds':['hypothesis-'+str(i)],'claimIds':[],'approved':False} for i,platform in enumerate(context['platforms'])]}

def generated(client,monkeypatch):
    p=prepared(client)
    monkeypatch.setattr(agent,'ask',fake_ask)
    r=client.post('/api/projects/'+p['id']+'/brief');assert r.status_code==200,r.text;p=r.json()
    p=update(client,p,concepts=[{**c,'approved':True} for c in p['concepts']],ratios=['1:1','1.91:1','4:5','9:16'],variations=2)
    r=client.post('/api/projects/'+p['id']+'/generate');assert r.status_code==200,r.text
    return r.json()

def test_health_and_gateway_auth(client):
    assert client.get('/api/health',headers={'X-Service-Token':''}).status_code==200
    assert client.get('/api/bootstrap',headers={'X-Service-Token':''}).status_code==401
    assert client.get('/api/bootstrap',headers={'X-User-Id':''}).status_code==401
    assert client.get('/api/bootstrap').json()['projects']==[]

def test_ownership_and_revision_conflicts(client):
    p=create(client)
    assert client.get('/api/projects/'+p['id'],headers={'X-User-Id':'another-user'}).status_code==404
    changed=update(client,p,title='Updated title')
    assert changed['revision']==p['revision']+1
    assert client.patch('/api/projects/'+p['id'],json={'revision':p['revision'],'title':'Overwrite'}).status_code==409
    assert client.get('/api/projects/'+p['id']).json()['title']=='Updated title'

def test_approval_gates_and_no_fabricated_ads(client):
    p=create(client)
    assert client.post('/api/projects/'+p['id']+'/generate').status_code==400
    p=prepared(client)
    assert all(x['count']==0 for x in p['report']['coverage'])
    assert all(x['evidenceIds']==[] for x in p['report']['insights'])
    assert 'hypotheses' in p['report']['summary']
    assert client.post('/api/projects/'+p['id']+'/brief').status_code==503

def test_evidence_source_and_platform_validation(client):
    p=create(client)
    evidence={'id':'ad','competitor':'Task Other','platform':'linkedin','sourceUrl':'https://evil.example/ad','headline':'Teamwork','body':'','cta':'Learn more','visual':'Dark background','started':'','region':'Global','importedAt':'2026-10-25'}
    assert client.patch('/api/projects/'+p['id'],json={'revision':p['revision'],'evidence':[evidence]}).status_code==400
    evidence['sourceUrl']='https://www.facebook.com/ads/library/?id=123'
    assert client.patch('/api/projects/'+p['id'],json={'revision':p['revision'],'evidence':[evidence]}).status_code==400
    evidence['sourceUrl']='https://www.linkedin.com/ad-library/detail/123'
    p=update(client,p,evidence=[evidence]);assert len(p['evidence'])==1

def test_generation_formats_history_and_export(client,monkeypatch):
    p=generated(client,monkeypatch)
    assert len(p['creatives'])==22
    assert not any(c['platform']=='linkedin' and c['ratio']=='9:16' for c in p['creatives'])
    assert len(p['contexts'])==1
    assert all(c['contextId']==p['contexts'][0]['id'] for c in p['creatives'])
    c=p['creatives'][0]
    p=update(client,p,creatives=[{**x,'headline':'Make space for meaningful work'} if x['id']==c['id'] else x for x in p['creatives']])
    edited=p['creatives'][0];assert edited['version']==2
    assert edited['history'][0]['headline']==c['headline']
    assert edited['status']=='review'
    p=update(client,p,creatives=[{**x,'status':'approved'} if x['id']==c['id'] else x for x in p['creatives']])
    for ext in ('png','jpg'):
        r=client.get(f"/api/projects/{p['id']}/render/{c['id']}.{ext}")
        assert r.status_code==200,r.text
        with Image.open(io.BytesIO(r.content)) as image:
            assert image.size==(1200,1200)
            assert image.format==('PNG' if ext=='png' else 'JPEG')
    r=client.get('/api/projects/'+p['id']+'/export');assert r.status_code==200,r.text
    with zipfile.ZipFile(io.BytesIO(r.content)) as package:
        assert package.testzip() is None
        assert sum(name.endswith('.png') for name in package.namelist())==1
        provenance=json.loads(package.read('research-and-provenance.json'))
        assert len(provenance['contexts'])==1

def test_claim_traceability_and_quality_block(client,monkeypatch):
    p=generated(client,monkeypatch)
    profile={**p['profile'],'claims':[{'text':'99% faster','quote':'99% faster','sourceId':'web-missing'}]}
    assert client.patch('/api/projects/'+p['id'],json={'revision':p['revision'],'profile':profile}).status_code==400
    c=p['creatives'][0]
    p=update(client,p,creatives=[{**x,'headline':'Guaranteed 999% more revenue'} if x['id']==c['id'] else x for x in p['creatives']])
    assert client.get(f"/api/projects/{p['id']}/render/{c['id']}.png").status_code==400

def test_upload_private_assets_and_reject_fake_files(client):
    p=create(client)
    assert client.post('/api/projects/'+p['id']+'/assets',files={'file':('bad.png',b'<script>bad</script>','image/png')}).status_code==400
    image=Image.new('RGB',(50,50),'green');buffer=io.BytesIO();image.save(buffer,format='PNG')
    r=client.post('/api/projects/'+p['id']+'/assets',files={'file':('logo.png',buffer.getvalue(),'image/png')});assert r.status_code==200,r.text
    asset_id=r.json()['assets'][0]['id']
    assert client.get('/api/assets/'+asset_id).status_code==200
    assert client.get('/api/assets/'+asset_id,headers={'X-User-Id':'another-user'}).status_code==404

def test_research_rejects_private_dns_and_unsafe_urls(monkeypatch):
    monkeypatch.setattr(socket,'getaddrinfo',lambda *args,**kwargs:[(socket.AF_INET,socket.SOCK_STREAM,6,'',('127.0.0.1',443))])
    for url in ('https://example.com','http://127.0.0.1','file:///etc/passwd','https://example.com:8080','http://localhost','https://user:pass@example.com'):
        with pytest.raises(HTTPException) as error:
            asyncio.run(research.destination(url))
        assert error.value.status_code==400


def test_login_attempts_are_durable_and_gateway_protected(client):
    payload={'fingerprint':'a'*64}
    assert client.post('/api/auth/attempt',json=payload,headers={'X-Service-Token':''}).status_code==401
    for _ in range(8):
        assert client.post('/api/auth/attempt',json=payload).status_code==200
    assert client.post('/api/auth/attempt',json=payload).status_code==429
