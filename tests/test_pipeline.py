from app.pipeline import _segments, _demo_metadata


def test_segments_cover_duration_in_five_second_units():
    segments = _segments("첫 문장입니다. 둘째 문장입니다. 셋째 문장입니다.", 12)
    assert [(item[0], item[1]) for item in segments] == [(0, 5), (5, 10), (10, 12)]
    assert all(item[2] for item in segments)


def test_demo_metadata_creates_safe_prompts():
    result = _demo_metadata("오늘의 말씀을 묵상합니다.", 10)
    assert len(result["scenes"]) == 2
    assert all(scene["source_status"] == "review_required" for scene in result["scenes"])
    assert all("16:9" in scene["visual_prompt_ko"] for scene in result["scenes"])

