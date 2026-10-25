"""Bounded public-site acquisition. Each hop resolves once and connects to that IP."""
import asyncio
import ipaddress
import re
import socket
from urllib.parse import urljoin, urlsplit, urlunsplit
import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException

async def destination(url: str) -> tuple[str, str]:
    try:
        u = urlsplit(url)
        if u.scheme not in ('https', 'http') or not u.hostname or u.username or u.password or u.port not in (None, 80, 443):
            raise ValueError()
        hostname = u.hostname.lower()
        if '.' not in hostname or hostname.endswith(('.local', '.internal', '.localhost', '.test', '.invalid')):
            raise ValueError()
        records = await asyncio.wait_for(asyncio.to_thread(socket.getaddrinfo, hostname, u.port or (443 if u.scheme == 'https' else 80), type=socket.SOCK_STREAM), 5)
        addresses = list(dict.fromkeys(r[4][0] for r in records))
        if not addresses or any(not ipaddress.ip_address(a).is_global for a in addresses):
            raise ValueError()
        address = next((a for a in addresses if ':' not in a), addresses[0])
        return hostname, address
    except (ValueError, OSError, asyncio.TimeoutError):
        raise HTTPException(400, 'Enter a public HTTP(S) website on a standard port. Private network addresses are not allowed.') from None

async def page(url: str) -> dict:
    async with httpx.AsyncClient(timeout=12, follow_redirects=False, trust_env=False) as client:
        for _ in range(5):
            hostname, address = await destination(url)
            pinned = httpx.URL(url).copy_with(host=address)
            headers = {'Host': hostname, 'User-Agent': 'SignalStudio/1.0 (business research)', 'Accept': 'text/html'}
            try:
                async with client.stream('GET', pinned, headers=headers, extensions={'sni_hostname': hostname.encode()}) as response:
                    if 300 <= response.status_code < 400:
                        if 'location' not in response.headers:
                            raise HTTPException(400, 'The website returned an invalid redirect.')
                        url = urljoin(url, response.headers['location'])
                        continue
                    if response.status_code != 200:
                        raise HTTPException(400, f'Website returned HTTP {response.status_code}. Use manual inputs if access is restricted.')
                    if 'text/html' not in response.headers.get('content-type', ''):
                        raise HTTPException(400, 'Business research requires an HTML page.')
                    raw = bytearray()
                    async for chunk in response.aiter_bytes():
                        raw.extend(chunk)
                        if len(raw) > 1_200_000:
                            raise HTTPException(400, 'Page exceeds the research size limit.')
            except httpx.HTTPError:
                raise HTTPException(400, 'Website could not be reached. Add business details manually.') from None
            soup = BeautifulSoup(bytes(raw), 'html.parser')
            title = soup.title.get_text(' ', strip=True) if soup.title else hostname
            links = [urljoin(url, a['href']) for a in soup.select('a[href]')]
            for tag in soup(['script', 'style', 'nav', 'footer', 'noscript', 'svg']):
                tag.decompose()
            return {'url': url, 'title': title, 'text': soup.get_text(' ', strip=True)[:14000], 'links': links, 'colors': re.findall(r'#[a-fA-F0-9]{6}\b', raw.decode('utf-8', 'replace'))}
    raise HTTPException(400, 'Website exceeded the redirect limit.')

async def acquire(project: dict) -> tuple[list[dict], list[str]]:
    sources = []
    colors = ['#6e56cf', '#163d35', '#e9eece']
    if project['website']:
        home = await page(project['website'])
        sources.append({'id': 'web-1', 'url': home['url'], 'title': home['title'], 'text': home['text']})
        origin = urlsplit(home['url']).netloc
        links = list(dict.fromkeys(link for link in home['links'] if urlsplit(link).netloc == origin and re.search(r'about|product|solution|pricing|customer|service', urlsplit(link).path, re.I)))[:3]
        results = await asyncio.gather(*(page(link) for link in links), return_exceptions=True)
        for result in results:
            if isinstance(result, dict):
                sources.append({'id': f'web-{len(sources)+1}', **{k: result[k] for k in ('url', 'title', 'text')}})
        extracted = list(dict.fromkeys(c for c in home['colors'] if c.lower() not in ('#ffffff', '#000000')))[:3]
        if extracted:
            colors = extracted
    if project['description']:
        sources.append({'id': 'manual', 'url': 'user-input', 'title': 'Business details supplied by user', 'text': project['description'] + '\nAudience: ' + project['audience']})
    if len(' '.join(s['text'] for s in sources)) < 90:
        raise HTTPException(400, 'Not enough readable business information. Add at least 90 characters of description, products and target customers.')
    return sources, colors
