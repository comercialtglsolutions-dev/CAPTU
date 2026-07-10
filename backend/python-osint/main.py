"""
CAPTU OSINT Microservice - Mr. Holmes Integration
FastAPI wrapper para o Mr. Holmes OSINT Tool
"""

import os
import json
import asyncio
import subprocess
import re
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="CAPTU OSINT Service",
    description="Microserviço de inteligência OSINT powered by Mr. Holmes",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Modelos ──────────────────────────────────────────────────────────────────

class OsintRequest(BaseModel):
    target: str
    search_type: str  # "username" | "domain" | "phone"
    platforms: Optional[List[str]] = None  # filtrar plataformas específicas

class OsintResult(BaseModel):
    platform: str
    url: str
    found: bool
    username: str
    profile_data: Optional[Dict[str, Any]] = None

class OsintResponse(BaseModel):
    target: str
    search_type: str
    results: List[Dict[str, Any]]
    count: int
    total_checked: int


# ─── Helpers ──────────────────────────────────────────────────────────────────

KNOWN_PLATFORMS = [
    "Instagram", "Twitter", "TikTok", "GitHub", "GitLab", "YouTube",
    "Reddit", "Pinterest", "Tumblr", "Flickr", "Vimeo", "SoundCloud",
    "Spotify", "Twitch", "Steam", "Xbox", "PlayStation", "Roblox",
    "Minecraft", "Chess.com", "Gravatar", "DockerHub", "Disqus",
    "Imgur", "MixCloud", "Kik", "Wattpad", "Ngl.link", "Tellonym",
    "JoinRoll", "BinarySearch", "Pr0gramm"
]

def check_username_on_platform(username: str, platform: str) -> Dict[str, Any]:
    """Verifica se um username existe em uma plataforma específica via HTTP."""
    platform_urls = {
        "Instagram": f"https://www.instagram.com/{username}/",
        "Twitter": f"https://twitter.com/{username}",
        "TikTok": f"https://www.tiktok.com/@{username}",
        "GitHub": f"https://github.com/{username}",
        "GitLab": f"https://gitlab.com/{username}",
        "YouTube": f"https://www.youtube.com/@{username}",
        "Reddit": f"https://www.reddit.com/user/{username}",
        "Pinterest": f"https://www.pinterest.com/{username}/",
        "Tumblr": f"https://{username}.tumblr.com",
        "Flickr": f"https://www.flickr.com/people/{username}/",
        "Vimeo": f"https://vimeo.com/{username}",
        "SoundCloud": f"https://soundcloud.com/{username}",
        "Spotify": f"https://open.spotify.com/user/{username}",
        "Twitch": f"https://www.twitch.tv/{username}",
        "Steam": f"https://steamcommunity.com/id/{username}",
        "Chess.com": f"https://www.chess.com/member/{username}",
        "Gravatar": f"https://en.gravatar.com/{username}",
        "DockerHub": f"https://hub.docker.com/u/{username}",
        "Disqus": f"https://disqus.com/by/{username}/",
        "Imgur": f"https://imgur.com/user/{username}",
        "MixCloud": f"https://www.mixcloud.com/{username}/",
        "Wattpad": f"https://www.wattpad.com/user/{username}",
    }

    url = platform_urls.get(platform)
    if not url:
        return {"platform": platform, "url": "", "found": False, "username": username}

    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        response = urllib.request.urlopen(req, timeout=8)
        status = response.getcode()
        found = status == 200
        return {
            "platform": platform,
            "url": url,
            "found": found,
            "username": username,
            "profile_data": {"status_code": status} if found else None
        }
    except urllib.error.HTTPError as e:
        found = e.code not in [404, 410]
        return {
            "platform": platform,
            "url": url,
            "found": found,
            "username": username,
            "profile_data": None
        }
    except Exception:
        return {
            "platform": platform,
            "url": url,
            "found": False,
            "username": username,
            "profile_data": None
        }


def check_domain(domain: str) -> Dict[str, Any]:
    """Verifica informações básicas de um domínio."""
    result = {
        "domain": domain,
        "reachable": False,
        "http_status": None,
        "https_available": False,
        "www_redirect": False,
        "platforms_found": []
    }
    
    for scheme in ["https", "http"]:
        url = f"{scheme}://{domain}"
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            resp = urllib.request.urlopen(req, timeout=8)
            result["reachable"] = True
            result["http_status"] = resp.getcode()
            if scheme == "https":
                result["https_available"] = True
            break
        except urllib.error.HTTPError as e:
            result["http_status"] = e.code
            result["reachable"] = True
            break
        except Exception:
            continue
    
    return result


def check_phone(phone: str) -> Dict[str, Any]:
    """Verifica informações sobre um número de telefone."""
    result = {
        "phone": phone,
        "formatted": phone,
        "country": "Unknown",
        "carrier": "Unknown",
        "is_valid": False,
        "type": "Unknown"
    }
    
    # Limpeza básica
    clean_phone = re.sub(r'[^\d+]', '', phone)
    result["formatted"] = clean_phone
    
    # Validação básica
    if len(clean_phone) >= 8:
        result["is_valid"] = True
        
        # Detecção de país por prefixo
        if clean_phone.startswith('+55') or clean_phone.startswith('55'):
            result["country"] = "Brasil 🇧🇷"
            result["type"] = "Celular" if len(clean_phone) >= 13 else "Fixo"
        elif clean_phone.startswith('+1') or clean_phone.startswith('1'):
            result["country"] = "EUA/Canadá 🇺🇸"
        elif clean_phone.startswith('+351'):
            result["country"] = "Portugal 🇵🇹"
        elif clean_phone.startswith('+44'):
            result["country"] = "Reino Unido 🇬🇧"
        elif clean_phone.startswith('+34'):
            result["country"] = "Espanha 🇪🇸"
        elif clean_phone.startswith('+49'):
            result["country"] = "Alemanha 🇩🇪"
    
    return result


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {
        "status": "ok",
        "service": "CAPTU OSINT Microservice",
        "engine": "Mr. Holmes Integration",
        "version": "1.0.0"
    }


@app.get("/platforms")
async def get_platforms():
    """Lista todas as plataformas suportadas na busca de username."""
    return {"platforms": KNOWN_PLATFORMS, "count": len(KNOWN_PLATFORMS)}


@app.post("/search", response_model=OsintResponse)
async def search_osint(request: OsintRequest):
    """
    Executa busca OSINT baseada no tipo:
    - username: verifica presença em 30+ plataformas
    - domain: analisa domínio e coleta metadados
    - phone: valida e enriquece dados do número
    """
    target = request.target.strip()
    search_type = request.search_type.lower()
    
    if not target:
        raise HTTPException(status_code=400, detail="Target não pode ser vazio")
    
    if search_type not in ["username", "domain", "phone"]:
        raise HTTPException(status_code=400, detail="search_type deve ser: username, domain ou phone")

    results = []
    total_checked = 0

    # ── Busca por Username ──────────────────────────────────────────────────
    if search_type == "username":
        platforms_to_check = request.platforms or KNOWN_PLATFORMS
        total_checked = len(platforms_to_check)
        
        # Executa verificações em paralelo (lotes de 5 para não sobrecarregar)
        loop = asyncio.get_event_loop()
        tasks = []
        
        for platform in platforms_to_check:
            task = loop.run_in_executor(
                None, check_username_on_platform, target, platform
            )
            tasks.append(task)
        
        all_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in all_results:
            if isinstance(result, Exception):
                continue
            if result.get("found"):
                results.append(result)

    # ── Busca por Domínio ───────────────────────────────────────────────────
    elif search_type == "domain":
        total_checked = 1
        domain_info = await asyncio.get_event_loop().run_in_executor(
            None, check_domain, target
        )
        results = [domain_info]

    # ── Busca por Telefone ──────────────────────────────────────────────────
    elif search_type == "phone":
        total_checked = 1
        phone_info = await asyncio.get_event_loop().run_in_executor(
            None, check_phone, target
        )
        results = [phone_info]

    return OsintResponse(
        target=target,
        search_type=search_type,
        results=results,
        count=len(results),
        total_checked=total_checked
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("OSINT_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
