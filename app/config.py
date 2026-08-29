from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[1]
INSTALL_ROOT = ROOT.parent if ROOT.name.lower() == "app" and (ROOT.parent / "secrets").exists() else ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT.parent / "secrets" / ".env", ROOT / ".env"),
        extra="ignore",
    )

    app_secret: str = "local-demo-secret-change-before-sharing"
    app_base_url: str = "http://127.0.0.1:8010"
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    github_repository: str = ""
    openai_api_key: str = ""
    transcription_model: str = "gpt-4o-mini-transcribe"
    text_model: str = "gpt-4.1-mini"
    image_model: str = "gpt-image-1"
    remotion_enabled: bool = True
    remotion_command: str = "npm run render"
    max_upload_mb: int = 200

    @property
    def jobs_dir(self) -> Path:
        return INSTALL_ROOT / "data" / "jobs"

    @property
    def demo_mode(self) -> bool:
        return not bool(self.openai_api_key)


settings = Settings()
