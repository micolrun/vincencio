# Cloud Run 백엔드 배포

GitHub Pages는 화면만 제공하고, 이미지 생성은 Cloud Run에서 수행합니다. `OPENAI_API_KEY`는 절대로 저장소나 브라우저 코드에 넣지 않습니다.

## 배포 전 설정

1. Google Cloud에서 결제를 활성화하고 Cloud Run, Artifact Registry API를 켭니다.
2. Secret Manager에 `OPENAI_API_KEY`라는 보안 비밀을 만들고 키를 등록합니다.
3. 저장소 루트에서 다음처럼 배포합니다.

```bash
gcloud run deploy vincencio-api \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGINS=https://micolrun.github.io \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest
```

배포 후 Cloud Run이 발급한 HTTPS 주소를 Pages 앱의 백엔드 설정에 등록해야 합니다. 현재 백엔드는 실제 이미지 생성 API를 제공하지만, Firebase 사용자 토큰 검증은 다음 보안 단계에서 추가해야 합니다. 배포 전에는 생성 API를 공개하지 마세요.
