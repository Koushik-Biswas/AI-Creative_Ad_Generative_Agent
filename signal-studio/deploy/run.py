"""Start Python and Next.js in one Render/Docker service, then drop privileges."""
import hashlib
import hmac
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root=Path('/app')
env=os.environ.copy()
if len(env.get('SESSION_SECRET',''))<32 or len(env.get('WORKSPACE_PASSWORD',''))<12:
    sys.exit('Set SESSION_SECRET (32+ random characters) and WORKSPACE_PASSWORD (12+ characters) before starting.')
token=env.get('PYTHON_SERVICE_TOKEN') or hmac.new(env['SESSION_SECRET'].encode(),b'signal-studio-service',hashlib.sha256).hexdigest()
env.update(SERVICE_TOKEN=token,PYTHON_SERVICE_TOKEN=token,PYTHON_API_URL='http://127.0.0.1:8000',DEV_AUTH='0',HOSTNAME='0.0.0.0',PORT=env.get('PORT','10000'),DATA_DIR=env.get('DATA_DIR','/data'))
data=Path(env['DATA_DIR']);data.mkdir(parents=True,exist_ok=True)
if hasattr(os,'geteuid') and os.geteuid()==0:
    # Initialize a newly mounted persistent disk; never recursively change other paths.
    os.chown(data,10001,10001)
    os.setgroups([]);os.setgid(10001);os.setuid(10001)
children=[]
def stop(*_):
    for child in children:
        if child.poll() is None:child.terminate()
    for child in children:
        try:child.wait(timeout=8)
        except subprocess.TimeoutExpired:child.kill()
signal.signal(signal.SIGTERM,stop)
signal.signal(signal.SIGINT,stop)
try:
    children.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000'],cwd=root/'python',env=env))
    children.append(subprocess.Popen(['node','server.js'],cwd=root/'web',env=env))
    while all(child.poll() is None for child in children):time.sleep(.5)
finally:
    stop()
sys.exit(next((c.returncode for c in children if c.returncode),0))
