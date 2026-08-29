import io

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_demo_job_creation():
    response = client.post(
        "/api/jobs",
        files={"audio": ("sample.wav", io.BytesIO(b"RIFF-demo"), "audio/wav")},
        data={"source_reference": "마태 13,1-9", "copyright_approved": "true"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["scenes"]
    assert data["captions"]
    assert data["human_approved"] is False

