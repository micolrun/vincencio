from typing import Literal

from pydantic import BaseModel, Field


class Caption(BaseModel):
    start: float
    end: float
    text: str


class Scene(BaseModel):
    index: int
    start: float
    end: float
    narration: str
    visual_prompt_ko: str
    visual_prompt_en: str
    negative_prompt: str
    visual_type: Literal["illustration", "symbolic", "personal", "title"] = "illustration"
    source_status: Literal["verified", "review_required"] = "review_required"
    image_path: str | None = None


class ProjectManifest(BaseModel):
    id: str
    title: str
    status: str
    duration: float
    transcript: str
    captions: list[Caption] = Field(default_factory=list)
    scenes: list[Scene] = Field(default_factory=list)
    hashtags: list[str] = Field(default_factory=list)
    thumbnail_prompt: str = ""
    source_reference: str = ""
    copyright_approved: bool = False
    human_approved: bool = False
    warnings: list[str] = Field(default_factory=list)

