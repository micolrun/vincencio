# ADR-0001: GitHub 중심 개발·검증·배포

**Status:** Accepted
**Date:** 2026-08-29
**Deciders:** 프로젝트 소유자, 빈첸시오 말씀방 운영자

## Context

영상 제작 앱은 개발자 PC가 아니라 빈첸시오님 집 Windows PC에서 사용한다. 운영자는 Python, Node.js, Git 명령을 직접 다루지 않아야 한다. 음성·성경 자료·완성 영상·API 비밀키는 민감하므로 GitHub에 올라가면 안 된다. 프로그램 변경은 자동 검증된 버전만 전달되어야 한다.

## Decision

GitHub를 프로그램의 단일 코드 원본과 배포 통로로 사용한다.

- `main`: 실제 배포 가능한 코드만 유지한다.
- Pull Request: Python 테스트와 Remotion 구성 검사를 자동 실행한다.
- `v*` 태그: Windows 배포 ZIP과 SHA-256 체크섬을 GitHub Release로 만든다.
- 빈첸시오 PC: Release만 내려받고 `data`, `backups`, `secrets`, `logs`는 설치 폴더 밖에 보존한다.
- 음성, 생성 이미지, 렌더링 영상, OAuth 비밀키, API 키는 GitHub에 저장하지 않는다.
- 게시·저작권·성경 원문 승인 단계는 자동화하지 않고 사람 승인 게이트를 유지한다.

## Options Considered

### A. 개발 폴더를 PC끼리 직접 복사

| Dimension | Assessment |
|---|---|
| 초기 복잡도 | 낮음 |
| 업데이트 안정성 | 낮음 |
| 데이터 보존 | 실수 위험 큼 |
| 추적 가능성 | 낮음 |

### B. GitHub 중심 소스·CI·Release

| Dimension | Assessment |
|---|---|
| 초기 복잡도 | 중간 |
| 업데이트 안정성 | 높음 |
| 데이터 보존 | 앱과 데이터 분리로 높음 |
| 추적 가능성 | 커밋·태그·체크섬으로 높음 |

### C. 즉시 공개 클라우드 서비스로 전환

| Dimension | Assessment |
|---|---|
| 운영 복잡도 | 높음 |
| 월 비용 | 지속 발생 |
| 개인정보 노출면 | 증가 |
| 원격 사용성 | 높음 |

## Trade-off Analysis

GitHub 중심 배포는 최초 설정이 필요하지만, 별도 PC 운영·버전 추적·롤백·자동 테스트를 함께 해결한다. 영상 생성 자체는 빈첸시오 PC에서 실행하므로 대용량 음성과 영상이 GitHub를 거치지 않는다. 공개 클라우드화는 여러 사용자가 동시에 필요해질 때 다시 검토한다.

## Consequences

- 검증되지 않은 파일 복사 대신 Release 단위로 배포할 수 있다.
- 이전 버전으로 되돌리기 쉬워진다.
- GitHub Actions와 Release 관리가 필요하다.
- 첫 설치에서 Python과 Node.js 준비가 필요하다.
- GitHub 장애가 있어도 이미 설치된 앱과 로컬 데이터는 계속 사용할 수 있다.

## Action Items

- [x] CI 워크플로 추가
- [x] Release 워크플로 추가
- [x] Windows 설치·실행·백업 스크립트 추가
- [x] GitHub에 올리지 않을 데이터 규칙 추가
- [ ] GitHub 원격 저장소 생성 및 최초 푸시
- [ ] 빈첸시오 PC에서 신규 설치 시험
- [ ] 실제 OAuth와 API 키 설정 시험

