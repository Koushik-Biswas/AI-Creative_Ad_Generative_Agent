"""Run after npm run build. Starts isolated local services, exercises the real gateway, then stops them."""
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import httpx

root=Path(__file__).resolve().parent.parent
def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]

api_port,web_port=port(),port()
token=secrets.token_urlsafe(48);password=secrets.token_urlsafe(24)
env=os.environ.copy();env.pop('GROQ_API_KEY',None)
env.update(SERVICE_TOKEN=token,PYTHON_SERVICE_TOKEN=token,PYTHON_API_URL=f'http://127.0.0.1:{api_port}',SESSION_SECRET=secrets.token_urlsafe(48),WORKSPACE_PASSWORD=password,WORKSPACE_ID='workspace-owner',DEV_AUTH='0',PORT=str(web_port),HOSTNAME='127.0.0.1',NODE_ENV='production',NEXT_TELEMETRY_DISABLED='1')
children=[]
try:
    with tempfile.TemporaryDirectory(prefix='signal-gateway-test-') as data:
        env['DATA_DIR']=data
        children.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port',str(api_port)],cwd=root/'python',env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
        children.append(subprocess.Popen(['node',str(root/'.next/standalone/server.js')],cwd=root/'.next/standalone',env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
        with httpx.Client(base_url=f'http://127.0.0.1:{web_port}',timeout=15,trust_env=False) as client:
            deadline=time.monotonic()+35
            while True:
                try:
                    if client.get('/api/health').status_code==200:break
                except httpx.HTTPError:pass
                if time.monotonic()>deadline:raise RuntimeError('Local services did not become ready. Run npm run build and install Python requirements.')
                if any(c.poll() is not None for c in children):raise RuntimeError('A local test service exited unexpectedly.')
                time.sleep(.2)
            assert client.get('/api/bootstrap').status_code==401
            assert client.get('/').status_code in (303,307)
            assert client.post('/api/auth/login',json={'password':'incorrect'}).status_code==401
            login=client.post('/api/auth/login',json={'password':password})
            assert login.status_code==200,login.text
            cookie=login.cookies.get('signal_session');assert cookie
            assert 'HttpOnly' in login.headers['set-cookie'] and 'SameSite=strict' in login.headers['set-cookie']
            client.headers['Cookie']='signal_session='+cookie
            assert client.get('/api/bootstrap').status_code==200
            create=client.post('/api/projects',json={'title':'Gateway test','description':'A fictional B2B collaboration product for operations teams that brings projects, conversations and priorities together in a shared workspace.'})
            assert create.status_code==201,create.text
            p=create.json()
            researched=client.post('/api/projects/'+p['id']+'/research')
            assert researched.status_code==200,researched.text
            p=researched.json();assert p['profile']['confirmed'] is False
            stale=client.patch('/api/projects/'+p['id'],json={'revision':1,'title':'Stale change'})
            assert stale.status_code==409
            forbidden=client.post('/api/projects',json={'title':'X','description':'Test'},headers={'Origin':'https://unrelated.example'})
            assert forbidden.status_code==403
            assert client.get('/').status_code==200
            logout=client.post('/api/auth/logout');assert logout.status_code==303
            assert 'signal_session=' in logout.headers['set-cookie']
            print('PASS: real Next.js login, signed session, Python gateway, research, ownership boundary, revision conflict, origin check and logout.')
finally:
    for child in children:
        if child.poll() is None:child.terminate()
    for child in children:
        try:child.wait(timeout=5)
        except subprocess.TimeoutExpired:child.kill()
