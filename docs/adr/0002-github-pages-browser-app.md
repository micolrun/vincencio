# ADR-0002: GitHub Pages 브라우저 앱과 AI 백엔드 분리

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** 프로젝트 소유자

## Context

사용자는 `https://micolrun.github.io/vincencio/`에서 설치 없이 영상 제작 프로그램을 사용하고 싶다. GitHub Pages는 정적 HTML, CSS, JavaScript를 게시하며 Python/FastAPI 프로세스, Remotion 서버 렌더링, 비밀 API 키를 보관·실행할 수 없다. 음성과 성경 원고는 민감할 수 있다.

## Decision

- GitHub Pages에는 정적 브라우저 앱을 배포한다.
- 음성 파일은 Object URL로 브라우저에서만 열고 서버에 업로드하지 않는다.
- 브라우저 앱은 음성 길이, 5초 장면표, 자막 초안, 이미지 프롬프트, 썸네일 콘셉트, 해시태그와 SRT/JSON 다운로드를 제공한다.
- OpenAI API 키를 브라우저 코드나 GitHub 저장소에 넣지 않는다.
- 실제 AI 전사·이미지 생성·Remotion MP4 렌더링은 추후 별도의 인증된 HTTPS 백엔드로 제공한다.
- 성경 원문·저작권·장면 검수와 게시 승인은 사람이 수행한다.

## Options Considered

### A. Pages에서 모든 기능 실행

구현할 수 없으며 API 키가 노출된다.

### B. Pages 정적 앱 + 안전한 HTTPS 백엔드

정적 기능은 무료로 빠르게 제공하고, 서버가 필요한 기능만 분리할 수 있다. 선택한 방식이다.

### C. 기존 로컬 앱만 유지

전체 기능은 가능하지만 설치 없는 접근성 목표를 충족하지 못한다.

## Consequences

- 링크만 열어 기본 제작 설계를 사용할 수 있다.
- 음성을 기본적으로 외부에 보내지 않는다.
- AI 자동 전사와 MP4 렌더링에는 별도 백엔드 배포가 필요하다.
- Pages는 대용량 영상 파일 저장소나 상업용 SaaS 서버로 사용하지 않는다.

