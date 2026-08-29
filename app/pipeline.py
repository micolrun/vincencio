import json
import base64
import math
import re
from pathlib import Path

import httpx

from .config import settings
from .models import Caption, ProjectManifest, Scene


SYSTEM_RULES = """You create production metadata for a Korean Catholic Bible meditation video.
Use only the supplied transcript. Never invent Bible verses, dialogue, people, miracles, locations,
objects, doctrine, or personal experiences. Mark uncertain Bible content as review_required.
Prefer clearly illustrated or symbolic imagery over photorealistic reconstructions.
Do not imitate a real priest, saint, celebrity, or living person's face or voice.
Return valid JSON only."""

NEGATIVE_PROMPT = (
    "photorealistic documentary, modern clothing, modern buildings, text, letters, subtitles, "
    "logo, watermark, celebrity likeness, priest likeness, excessive glow, fantasy magic, "
    "graphic violence, horror, distorted face, deformed hands, duplicate people"
)


def _request_openai(path: str, *, json_body=None, files=None, data=None) -> dict:
    headers = {"Authorization": f"Bearer {settings.openai_api_key}"}
    with httpx.Client(timeout=180) as client:
        response = client.post(
            f"https://api.openai.com/v1/{path}",
            headers=headers,
            json=json_body,
            files=files,
            data=data,
        )
        response.raise_for_status()
        return response.json()


def transcribe(audio_path: Path) -> tuple[str, float]:
    if settings.demo_mode:
        return (
            "오늘 녹음의 전사 결과가 이곳에 표시됩니다. 실제 성경 본문은 원문과 대조한 뒤 "
            "승인해 주세요. 말씀을 삶으로 옮길 한 가지 실천을 함께 나눕니다.",
            20.0,
        )
    with audio_path.open("rb") as audio:
        result = _request_openai(
            "audio/transcriptions",
            files={"file": (audio_path.name, audio, "application/octet-stream")},
            data={"model": settings.transcription_model, "response_format": "json", "language": "ko"},
        )
    text = result.get("text", "").strip()
    duration = float(result.get("duration") or max(5, len(text) / 7))
    return text, duration


def _segments(text: str, duration: float, seconds: float = 5.0) -> list[tuple[float, float, str]]:
    chunks = [chunk.strip() for chunk in re.split(r"(?<=[.!?。])\s+", text) if chunk.strip()]
    count = max(1, math.ceil(duration / seconds))
    if not chunks:
        chunks = ["[전사 확인 필요]"]
    words = " ".join(chunks).split()
    per = max(1, math.ceil(len(words) / count))
    result = []
    for index in range(count):
        start = index * seconds
        end = min(duration, (index + 1) * seconds)
        narration = " ".join(words[index * per : (index + 1) * per]).strip()
        if not narration:
            narration = chunks[min(index, len(chunks) - 1)]
        result.append((start, end, narration))
    return result


def _demo_metadata(transcript: str, duration: float) -> dict:
    scenes = []
    for index, (start, end, narration) in enumerate(_segments(transcript, duration), 1):
        scenes.append(
            {
                "index": index,
                "start": start,
                "end": end,
                "narration": narration,
                "visual_prompt_ko": (
                    f"가톨릭 묵상 영상용 절제된 수채화 일러스트, 다음 의미를 상징적으로 표현: {narration}, "
                    "따뜻한 자연광, 베이지·청색·금색, 경건하고 고요한 분위기, 하단 자막 여백, 16:9, 글자 없음"
                ),
                "visual_prompt_en": (
                    f"Restrained sacred watercolor illustration symbolizing: {narration}. Warm natural light, "
                    "beige, deep blue and subtle gold palette, reverent quiet mood, lower subtitle-safe area, "
                    "16:9 landscape, no text."
                ),
                "negative_prompt": NEGATIVE_PROMPT,
                "visual_type": "symbolic",
                "source_status": "review_required",
            }
        )
    return {
        "title": "오늘의 말씀과 삶으로 옮기는 한 가지",
        "hashtags": ["#오늘의말씀", "#가톨릭묵상", "#빈첸시오말씀방"],
        "thumbnail_prompt": (
            "고요한 새벽빛 아래 펼쳐진 성경과 한 줄기 따뜻한 빛, 절제된 수채화풍, "
            "오른쪽에 3~5어절 제목을 넣을 넓은 여백, 16:9, 이미지 안 글자 없음"
        ),
        "scenes": scenes,
    }


def generate_metadata(transcript: str, duration: float) -> dict:
    if settings.demo_mode:
        return _demo_metadata(transcript, duration)
    schema_hint = {
        "title": "string",
        "hashtags": ["#tag"],
        "thumbnail_prompt": "string",
        "scenes": [
            {
                "index": 1,
                "start": 0,
                "end": 5,
                "narration": "string",
                "visual_prompt_ko": "string",
                "visual_prompt_en": "string",
                "negative_prompt": NEGATIVE_PROMPT,
                "visual_type": "illustration|symbolic|personal|title",
                "source_status": "verified|review_required",
            }
        ],
    }
    prompt = (
        f"{SYSTEM_RULES}\nCreate one scene for every 5 seconds from 0 to {duration:.2f}. "
        "Keep subtitle-safe space at the bottom. Use 16:9 cinematic compositions. "
        f"JSON shape: {json.dumps(schema_hint, ensure_ascii=False)}\nTRANSCRIPT:\n{transcript}"
    )
    result = _request_openai(
        "responses",
        json_body={"model": settings.text_model, "input": prompt},
    )
    raw = result.get("output_text")
    if not raw:
        raw = result["output"][0]["content"][0]["text"]
    return json.loads(raw)


def generate_scene_image(prompt: str, output_path: Path) -> None:
    if settings.demo_mode:
        raise RuntimeError("실제 이미지 생성에는 OPENAI_API_KEY가 필요합니다.")
    result = _request_openai(
        "images/generations",
        json_body={
            "model": settings.image_model,
            "prompt": prompt,
            "size": "1536x1024",
            "quality": "high",
            "output_format": "png",
        },
    )
    encoded = result["data"][0]["b64_json"]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(base64.b64decode(encoded))


def build_manifest(job_id: str, audio_path: Path) -> ProjectManifest:
    transcript, duration = transcribe(audio_path)
    generated = generate_metadata(transcript, duration)
    captions = [Caption(start=s, end=e, text=t) for s, e, t in _segments(transcript, duration)]
    scenes = [Scene.model_validate(item) for item in generated["scenes"]]
    return ProjectManifest(
        id=job_id,
        title=generated["title"],
        status="review",
        duration=duration,
        transcript=transcript,
        captions=captions,
        scenes=scenes,
        hashtags=generated["hashtags"][:5],
        thumbnail_prompt=generated["thumbnail_prompt"],
        warnings=[
            "성경 인용은 승인된 원문과 사람이 직접 대조해야 합니다.",
            "AI 장면은 실제 사건의 기록 영상이 아니라 묵상용 시각화입니다.",
            "저작권 승인과 사람의 최종 승인 전에는 렌더링·게시하지 마세요.",
        ],
    )
