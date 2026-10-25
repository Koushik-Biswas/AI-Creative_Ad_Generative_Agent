import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from fastapi import HTTPException

def now():
    return datetime.now(timezone.utc).isoformat()

def data_root():
    root = Path(os.getenv('DATA_DIR', './data'))
    root.mkdir(parents=True, exist_ok=True)
    return root

def db():
    con = sqlite3.connect(data_root() / 'signal.db', timeout=10)
    con.row_factory = sqlite3.Row
    return con

def initialize():
    with db() as con:
        con.execute('PRAGMA journal_mode=WAL')
        con.executescript('''
        CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS projects_owner ON projects(owner);
        CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, owner TEXT NOT NULL, project_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS assets_project ON assets(project_id);
        CREATE TABLE IF NOT EXISTS usage(id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
        ''')

def read(project_id, owner):
    with db() as con:
        row = con.execute('SELECT data,revision FROM projects WHERE id=? AND owner=?', (project_id, owner)).fetchone()
    if not row:
        raise HTTPException(404, 'Campaign not found')
    return {**json.loads(row['data']), 'revision': row['revision']}

def save(project, owner, activity='Campaign updated'):
    old_revision = project['revision']
    project['revision'] += 1
    project['updatedAt'] = now()
    project['activities'] = ([{'text': activity, 'at': now()}] + project['activities'])[:50]
    if len(json.dumps(project).encode())>1_800_000:
        raise HTTPException(413, 'Campaign history reached its storage limit. Duplicate inputs to continue.')
    with db() as con:
        cursor = con.execute('UPDATE projects SET title=?,data=?,revision=?,updated=? WHERE id=? AND owner=? AND revision=?', (project['title'], json.dumps(project), project['revision'], project['updatedAt'], project['id'], owner, old_revision))
        if cursor.rowcount != 1:
            raise HTTPException(409, 'Campaign changed in another tab. Refresh and retry.')
    return project
