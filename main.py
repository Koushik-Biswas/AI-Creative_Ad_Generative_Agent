import logging
import json
import os

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import AnyHttpUrl, BaseModel
from ai_engine import AIProviderError, scrape_site, generate_ad_strategy
from image_engine import create_ad_image

logger = logging.getLogger(__name__)
app = FastAPI(title="AI B2B Ad Creative Generator", version="1.0.0")

class AdRequest(BaseModel):
    url: AnyHttpUrl

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/ready")
async def ready() -> dict[str, str]:
    if not (os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY")):
        raise HTTPException(status_code=503, detail="AI provider credentials are not configured")
    return {"status": "ready"}

@app.post("/generate")
async def generate_end_to_end(req: AdRequest, request: Request):
    try:
        if request.headers.get("content-length", "0").isdigit() and int(request.headers["content-length"]) > 4096:
            raise ValueError("Request payload is too large")
        # 1. Scrape
        text = await scrape_site(str(req.url))
        
        # 2. AI Strategy
        strategy = await run_in_threadpool(generate_ad_strategy, text)
        
        # 3. Generate Image
        img_b64 = create_ad_image(
            headline=strategy["ad_headline"],
            subtext=strategy["ad_subtext"],
            cta=strategy["cta"],
            bg_color=strategy.get("brand_color", "#000000")
        )
        
        return {
            "strategy": strategy,
            "image_base64": img_b64
        }
    except AIProviderError as exc:
        logger.error("%s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.error("AI service is not configured: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except (httpx.HTTPError, ValueError, KeyError, json.JSONDecodeError) as exc:
        logger.warning("Ad generation request failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Unexpected ad generation failure")
        raise HTTPException(status_code=500, detail="Ad generation failed") from None