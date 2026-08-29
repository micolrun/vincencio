# 빈첸시오 말씀방 영상 스튜디오

음성 녹음 파일을 올리면 전사, 5초 장면표, 자막, 성경 기반 이미지 프롬프트, 썸네일 콘셉트와 해시태그를 만들고, 사람이 검수한 뒤 Remotion으로 영상을 렌더링하는 로컬 우선 제작 앱입니다.

## GitHub 중심 운영

이 저장소가 프로그램 코드의 단일 원본입니다. Pull Request와 `main`/`master` 푸시는 GitHub Actions에서 Python 테스트, Remotion 구성 검사와 10초 렌더링 시험을 실행합니다. `v0.1.0` 같은 태그를 푸시하면 Windows 배포 ZIP과 SHA-256 체크섬을 GitHub Release에 자동 게시합니다.

빈첸시오님 PC에서는 소스코드를 직접 수정하거나 `git pull`하지 않습니다. 검증된 Release ZIP만 설치하며, 음성·영상·API 키는 GitHub에 올리지 않습니다. 결정 배경은 [ADR-0001](docs/adr/0001-github-centered-delivery.md), 보안 규칙은 [SECURITY.md](SECURITY.md)를 참고하세요.

## GitHub Pages 앱

설치 없는 브라우저 버전은 `https://micolrun.github.io/vincencio/`에서 실행됩니다. `site/`의 정적 앱을 `.github/workflows/pages.yml`이 자동 배포합니다. Pages 버전은 음성을 외부로 전송하지 않고 파일 길이를 읽어 5초 장면표, 자막, 이미지 프롬프트, 썸네일 콘셉트와 해시태그를 만들며 SRT와 프로젝트 JSON을 내려받습니다.

GitHub Pages는 서버 프로그램을 실행하거나 비밀 API 키를 안전하게 보관할 수 없으므로 AI 전사·이미지 생성·Remotion MP4 렌더링은 별도 HTTPS 백엔드가 필요합니다. 구조 결정은 [ADR-0002](docs/adr/0002-github-pages-browser-app.md)를 참고하세요.

## 현재 구현된 기능

- WAV, MP3, M4A, AAC, OGG, WebM, MP4 업로드
- API 키가 없을 때 안전한 데모 모드
- OpenAI 전사와 메타데이터 생성 연결부
- 5초 단위 장면 및 SRT용 자막 데이터 생성
- 한글·영문 이미지 프롬프트와 네거티브 프롬프트
- 썸네일 콘셉트와 해시태그
- 원문 확인 상태를 장면별로 기록하는 검수 화면
- 출처·저작권·사람 승인 게이트
- Google OAuth 로그인
- 별도 GitHub OAuth 연결 및 저장소 목록 API
- 1080p Remotion 영상 템플릿

## 빠른 시작

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

브라우저에서 `http://127.0.0.1:8010`을 엽니다. 기존 Farm Doctor AI가 사용하는 8000번 포트와 충돌하지 않도록 8010번을 기본값으로 사용합니다. `OPENAI_API_KEY`를 비워 두면 실제 파일을 외부로 전송하지 않는 데모 모드로 동작합니다.

설치가 끝난 뒤에는 프로젝트 루트의 `Start-Vincentio.cmd`를 더블클릭하세요. 실행기는 서버가 이미 켜져 있는지 먼저 확인하고, 필요할 때만 숨김 백그라운드 서버를 시작합니다. `/api/health` 응답이 확인된 후에 브라우저를 열기 때문에 빈 127.0.0.1 화면이 먼저 나타나지 않습니다. 오류가 발생하면 `logs/server.err.log`에서 원인을 확인할 수 있습니다.

Remotion 미리보기와 렌더링:

```powershell
npm install
npm run studio
npm run render
```

## Google 로그인 설정

Google Cloud Console에서 OAuth 동의 화면과 웹 애플리케이션 클라이언트를 만든 뒤 다음 URI를 등록합니다.

```text
승인된 JavaScript 원본: http://127.0.0.1:8010
승인된 리디렉션 URI: http://127.0.0.1:8010/auth/google/callback
```

발급된 값을 `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 넣습니다. 배포 시에는 `APP_BASE_URL`을 HTTPS 주소로 바꾸고 쿠키의 `https_only` 설정도 활성화해야 합니다.

## GitHub 연결 설정

GitHub OAuth App을 만들고 Authorization callback URL을 아래와 같이 지정합니다.

```text
http://127.0.0.1:8010/auth/github/callback
```

Client ID와 Secret을 `.env`에 넣습니다. Google 로그인은 앱 사용자 확인용이고 GitHub 저장소 쓰기 권한은 GitHub OAuth로 별도 승인해야 합니다. 액세스 토큰은 브라우저 쿠키에 넣지 않고 현재 로컬 서버 메모리에만 보관하므로 앱을 재시작하면 다시 연결해야 합니다.

## 제작 흐름

1. 음성과 승인된 성경 출처를 입력합니다.
2. 전사와 5초 장면 초안을 생성합니다.
3. 각 장면의 성경 근거와 이미지 프롬프트를 검수합니다.
4. `확인 필요`를 모두 `원문 확인됨`으로 변경합니다.
5. 이미지 생성 결과를 장면에 연결합니다.
6. 자막 안전영역과 발음을 확인합니다.
7. 사람 승인 후 Remotion으로 1080p 영상을 렌더링합니다.
8. YouTube 업로드 전 저작권과 AI 합성 콘텐츠 표시를 다시 확인합니다.

## 중요한 제한

- 실제 이미지 생성은 검수 화면에서 장면을 `원문 확인됨`으로 바꾼 뒤 장면 생성 API를 호출합니다. 비용 폭증을 막기 위해 기본 UI에서는 무심코 전체 장면을 일괄 생성하지 않습니다.
- 최종 승인된 작업만 `/api/jobs/{id}/render`에서 Remotion 렌더링할 수 있습니다.
- 실제 성경 인용을 AI가 검증했다고 간주하면 안 됩니다. 승인된 원문과 사람이 직접 대조해야 합니다.
- GitHub에 미디어 원본이나 OAuth 비밀키를 커밋하지 마세요.
- Google 계정으로 GitHub API 권한을 대신 받을 수 없습니다. 두 인증은 목적과 권한이 다릅니다.
