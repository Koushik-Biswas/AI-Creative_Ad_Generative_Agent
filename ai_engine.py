import os
import json
import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
import google.generativeai as genai

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")

class AIProviderError(RuntimeError):
    """Raised when the configured AI provider cannot complete a request."""

def _validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only public HTTP(S) URLs are allowed")

    try:
        addresses = {
            result[4][0]
            for result in socket.getaddrinfo(parsed.hostname, None)
        }
    except socket.gaierror as exc:
        raise ValueError("The website hostname could not be resolved") from exc

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise ValueError("Private, local, and reserved network addresses are not allowed")

async def scrape_site(url: str) -> str:
    _validate_public_url(url)
    headers = {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "AI-Ad-Intelligence/1.0",
    }
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(follow_redirects=False, headers=headers, timeout=timeout) as client:
        current_url = url
        for _ in range(4):
            _validate_public_url(current_url)
            response = await client.get(current_url)
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ValueError("The website returned an invalid redirect")
                current_url = urljoin(current_url, location)
                continue
            break
        else:
            raise ValueError("The website redirected too many times")
        response.raise_for_status()
        if response.headers.get("content-type", "").split(";")[0].lower() not in {
            "text/html", "application/xhtml+xml"
        }:
            raise ValueError("The URL did not return an HTML document")
        if len(response.content) > 2_000_000:
            raise ValueError("The website response is too large")
        soup = BeautifulSoup(response.text, "html.parser")
        for script in soup(["script", "style"]): script.extract()
        text = soup.get_text(separator=' ', strip=True)
        if not text:
            raise ValueError("The website did not contain readable text")
        return text[:10000]

def _strategy_prompt(website_text: str) -> str:
    return f"""
You are an expert B2B marketer. Read this website and generate an ad strategy.
Website: {website_text}

Return only valid JSON with these string fields:
{{
  "company_name": "Name",
  "target_audience": "Who they sell to",
  "ad_headline": "Short punchy headline for LinkedIn, max 6 words",
  "ad_subtext": "One sentence explaining the value",
  "cta": "Book a Demo",
  "brand_color": "#0A2540"
}}
"""

def _validate_strategy(strategy: dict) -> dict:
    required = ("company_name", "target_audience", "ad_headline", "ad_subtext", "cta")
    if any(not isinstance(strategy.get(field), str) or not strategy[field].strip() for field in required):
        raise ValueError("The AI response did not contain a complete ad strategy")
    return strategy

def generate_ad_strategy(website_text: str) -> dict:
    groq_key = os.getenv("GROQ_API_KEY")
    api_key = groq_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("AI provider credentials are not configured")
    prompt = _strategy_prompt(website_text)

    # gsk_ keys are Groq credentials, not Google Gemini credentials.
    try:
        if groq_key or api_key.startswith("gsk_"):
            groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": "Bearer " + api_key},
                    json={
                        "model": groq_model,
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": "Return only valid JSON."},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
            return _validate_strategy(json.loads(content))

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return _validate_strategy(json.loads(response.text))
    except (httpx.HTTPError, json.JSONDecodeError, KeyError, ValueError) as exc:
        message = str(exc)
        if isinstance(exc, httpx.HTTPStatusError):
            try:
                message = exc.response.json().get("error", {}).get("message", message)
            except ValueError:
                pass
        raise AIProviderError(f"AI provider request failed: {message[:500]}") from exc
    except Exception as exc:
        message = str(exc)
        raise AIProviderError(f"AI provider request failed: {message[:500]}") from exc