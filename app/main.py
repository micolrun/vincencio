import json
import secrets
import shutil
import subprocess
import uuid
from pathlib import Path

import httpx
from authlib.integrations.starlette_client import OAuth
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .config import ROOT, settings
from .models import ProjectManifest
from .pipeline import build_manifest, generate_scene_image


app = FastAPI(title="빈첸시오 말씀방 영상 스튜디오")
app.add_middleware(SessionMiddleware, secret_key=settings.app_secret, same_site="lax", https_only=False)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
oauth = OAuth()
if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

# Personal local app: tokens stay in server memory and never enter the browser cookie.
github_tokens: dict[str, str] = {}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "demo_mode": settings.demo_mode,
        "google_login_configured": bool(settings.google_client_id and settings.google_client_secret),
        "github_configured": bool(settings.github_client_id and settings.github_client_secret),
        "remotion_enabled": settings.remotion_enabled,
    }


@app.post("/api/jobs", response_model=ProjectManifest)
def create_job(
    audio: UploadFile = File(...),
    source_reference: str = Form(""),
    copyright_approved: bool = Form(False),
) -> ProjectManifest:
    extension = Path(audio.filename or "audio.wav").suffix.lower()
    if extension not in {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".webm", ".mp4"}:
        raise HTTPException(400, "지원하지 않는 음성 파일 형식입니다.")
    job_id = uuid.uuid4().hex[:12]
    job_dir = settings.jobs_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=False)
    audio_path = job_dir / f"source{extension}"
    with audio_path.open("wb") as target:
        shutil.copyfileobj(audio.file, target)
    if audio_path.stat().st_size > settings.max_upload_mb * 1024 * 1024:
        audio_path.unlink(missing_ok=True)
        raise HTTPException(413, "파일 크기 제한을 초과했습니다.")
    manifest = build_manifest(job_id, audio_path)
    manifest.source_reference = source_reference.strip()
    manifest.copyright_approved = copyright_approved
    (job_dir / "manifest.json").write_text(
        manifest.model_dump_json(indent=2), encoding="utf-8"
    )
    return manifest


@app.get("/api/jobs/{job_id}", response_model=ProjectManifest)
def get_job(job_id: str) -> ProjectManifest:
    path = settings.jobs_dir / job_id / "manifest.json"
    if not path.exists():
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    return ProjectManifest.model_validate_json(path.read_text(encoding="utf-8"))


@app.put("/api/jobs/{job_id}", response_model=ProjectManifest)
def update_job(job_id: str, manifest: ProjectManifest) -> ProjectManifest:
    if manifest.id != job_id:
        raise HTTPException(400, "작업 ID가 일치하지 않습니다.")
    path = settings.jobs_dir / job_id / "manifest.json"
    if not path.exists():
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    return manifest


@app.post("/api/jobs/{job_id}/approve", response_model=ProjectManifest)
def approve_job(job_id: str) -> ProjectManifest:
    manifest = get_job(job_id)
    if not manifest.source_reference or not manifest.copyright_approved:
        raise HTTPException(409, "출처와 저작권 사용 확인을 먼저 완료하세요.")
    if any(scene.source_status == "review_required" for scene in manifest.scenes):
        raise HTTPException(409, "확인 필요로 표시된 장면을 모두 검토하세요.")
    manifest.human_approved = True
    manifest.status = "approved"
    return update_job(job_id, manifest)


@app.post("/api/jobs/{job_id}/scenes/{scene_index}/generate", response_model=ProjectManifest)
def create_scene_image(job_id: str, scene_index: int) -> ProjectManifest:
    manifest = get_job(job_id)
    scene = next((item for item in manifest.scenes if item.index == scene_index), None)
    if not scene:
        raise HTTPException(404, "장면을 찾을 수 없습니다.")
    if scene.source_status != "verified":
        raise HTTPException(409, "원문 확인이 완료된 장면만 이미지를 생성할 수 있습니다.")
    job_dir = settings.jobs_dir / job_id
    filename = f"scene_{scene.index:03d}.png"
    image_path = job_dir / filename
    try:
        generate_scene_image(f"{scene.visual_prompt_en}\nAvoid: {scene.negative_prompt}", image_path)
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from error
    public_dir = ROOT / "public" / "jobs" / job_id
    public_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(image_path, public_dir / filename)
    scene.image_path = f"jobs/{job_id}/{filename}"
    return update_job(job_id, manifest)


@app.post("/api/jobs/{job_id}/render")
def render_job(job_id: str) -> dict:
    manifest = get_job(job_id)
    if not manifest.human_approved:
        raise HTTPException(409, "사람의 최종 승인 후에만 렌더링할 수 있습니다.")
    if not settings.remotion_enabled:
        raise HTTPException(503, "REMOTION_ENABLED=true 설정이 필요합니다.")
    job_dir = settings.jobs_dir / job_id
    source_audio = next(job_dir.glob("source.*"), None)
    if not source_audio:
        raise HTTPException(404, "원본 음성을 찾을 수 없습니다.")
    public_dir = ROOT / "public" / "jobs" / job_id
    public_dir.mkdir(parents=True, exist_ok=True)
    audio_name = f"audio{source_audio.suffix.lower()}"
    shutil.copy2(source_audio, public_dir / audio_name)
    props = {
        "title": manifest.title,
        "duration": manifest.duration,
        "audio_path": f"jobs/{job_id}/{audio_name}",
        "scenes": [scene.model_dump() for scene in manifest.scenes],
        "captions": [caption.model_dump() for caption in manifest.captions],
    }
    props_path = job_dir / "remotion-props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")
    output_path = settings.jobs_dir.parent.parent / "renders" / f"{job_id}.mp4"
    output_path.parent.mkdir(exist_ok=True)
    command = [
        "npm.cmd", "exec", "remotion", "render", "remotion/index.ts", "VincentioVideo",
        str(output_path), f"--props={props_path}",
    ]
    completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=3600)
    if completed.returncode:
        raise HTTPException(500, f"렌더링 실패: {completed.stderr[-1000:]}")
    manifest.status = "rendered"
    update_job(job_id, manifest)
    return {"ok": True, "download_url": f"/api/jobs/{job_id}/video"}


@app.get("/api/jobs/{job_id}/video")
def download_video(job_id: str):
    path = settings.jobs_dir.parent.parent / "renders" / f"{job_id}.mp4"
    if not path.exists():
        raise HTTPException(404, "렌더링된 영상을 찾을 수 없습니다.")
    return FileResponse(path, media_type="video/mp4", filename=f"vincentio-{job_id}.mp4")


@app.get("/auth/status")
def auth_status(request: Request) -> dict:
    session_id = request.session.get("session_id")
    return {
        "google_user": request.session.get("google_user"),
        "github_connected": bool(session_id and session_id in github_tokens),
    }


@app.get("/auth/google")
async def google_login(request: Request):
    if not settings.google_client_id:
        return JSONResponse({"configured": False, "message": "Google OAuth 설정이 필요합니다."}, 503)
    redirect_uri = f"{settings.app_base_url}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request):
    if not settings.google_client_id:
        raise HTTPException(503, "Google OAuth 설정이 필요합니다.")
    token = await oauth.google.authorize_access_token(request)
    profile = token.get("userinfo") or await oauth.google.userinfo(token=token)
    request.session["google_user"] = {
        "sub": profile.get("sub"), "email": profile.get("email"), "name": profile.get("name")
    }
    request.session.setdefault("session_id", secrets.token_urlsafe(24))
    return RedirectResponse("/")


@app.post("/auth/logout")
def logout(request: Request) -> dict:
    session_id = request.session.get("session_id")
    if session_id:
        github_tokens.pop(session_id, None)
    request.session.clear()
    return {"ok": True}


@app.get("/auth/github")
def github_connect(request: Request):
    if not settings.github_client_id:
        return JSONResponse({"configured": False, "message": "GitHub OAuth 설정이 필요합니다."}, 503)
    state = secrets.token_urlsafe(24)
    request.session["github_state"] = state
    request.session.setdefault("session_id", secrets.token_urlsafe(24))
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.github_client_id}&scope=repo&state={state}&redirect_uri="
        f"{settings.app_base_url}/auth/github/callback"
    )
    return RedirectResponse(url)


@app.get("/auth/github/callback")
def github_callback(code: str, state: str, request: Request):
    if not secrets.compare_digest(state, request.session.pop("github_state", "")):
        raise HTTPException(400, "GitHub OAuth state가 일치하지 않습니다.")
    response = httpx.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": settings.github_client_id,
            "client_secret": settings.github_client_secret,
            "code": code,
            "redirect_uri": f"{settings.app_base_url}/auth/github/callback",
        },
        timeout=30,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise HTTPException(400, "GitHub 토큰을 받지 못했습니다.")
    session_id = request.session.setdefault("session_id", secrets.token_urlsafe(24))
    github_tokens[session_id] = token
    return RedirectResponse("/")


@app.get("/api/github/repositories")
def github_repositories(request: Request) -> list[dict]:
    token = github_tokens.get(request.session.get("session_id", ""))
    if not token:
        raise HTTPException(401, "GitHub 연결이 필요합니다.")
    response = httpx.get(
        "https://api.github.com/user/repos?sort=updated&per_page=50",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=30,
    )
    response.raise_for_status()
    return [
        {"full_name": item["full_name"], "private": item["private"], "html_url": item["html_url"]}
        for item in response.json()
    ]
