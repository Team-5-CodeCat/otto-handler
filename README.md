# Otto Handler

NestJS 기반 애플리케이션

## 개발 환경 설정

### 필수 요구사항
- Node.js 22.x
- pnpm 9.x
- Docker & Docker Compose

### 빠른 시작

1. **의존성 설치**
```bash
pnpm install
```

2. **환경변수 설정**
```bash
cp .env.example .env
```

3. **Docker 서비스 시작**
```bash
docker compose up -d
```

4. **개발 작업 시작**
```bash
# 컨테이너에 접속
./dev.sh shell

# 컨테이너 내부에서 개발 서버 시작
pnpm run start:dev
```

### 개발 스크립트 사용법

편의를 위해 `dev.sh` 스크립트를 제공합니다:

```bash
# 컨테이너에 접속하여 개발 시작
./dev.sh shell

# 실시간 로그 확인
./dev.sh logs

# 도움말 확인
./dev.sh help
```

### 개발 워크플로우

1. `docker compose up -d` - 모든 서비스 시작
2. `./dev.sh shell` - 컨테이너에 접속
3. `pnpm run start:dev` - 개발 서버 시작 (핫 리로드)

### 서비스 포트
- 애플리케이션: http://localhost:4000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 새로운 라이브러리 설치

Docker 환경에서 새로운 패키지를 설치할 때는 다음 방법들을 사용하세요:

### 방법 1: 로컬 설치 + 컨테이너 재빌드 (권장)
```bash
# 1. 로컬에서 패키지 설치
pnpm i --save @package-name

# 2. 컨테이너 재빌드
docker compose up --build -d
```

### 방법 2: 컨테이너 내부에서 설치
```bash
# 1. 컨테이너 접속 후 설치
docker compose exec app sh
pnpm i --save @package-name
exit

# 2. 컨테이너 재시작 (선택사항)
docker compose restart app
```

### 방법 3: 빠른 임시 설치
```bash
# 실행 중인 컨테이너에서 바로 설치
docker compose exec app pnpm add @package-name
```

> **참고**: package.json이 변경되면 팀원들과 공유하기 위해 git commit 필요

## 개발 도구

### 컨테이너 접속 및 명령어 실행
```bash
./dev.sh shell                      # 컨테이너 접속
./dev.sh logs                       # 실시간 로그 확인
./dev.sh help                       # 사용 가능한 명령어 확인
```

### 직접 Docker 명령어 사용
```bash
docker compose logs app -f          # 실시간 로그
docker compose logs app --tail=50   # 최근 50줄
docker compose restart app          # app 컨테이너만 재시작
docker compose exec app sh          # 컨테이너 내부 직접 접속
```

## 코드 변경 시 반영 방법

### 1. 소스 코드 변경 (TypeScript, JavaScript 파일)
- **자동 반영**: `pnpm run start:dev` 실행 중이면 파일 저장 시 핫 리로드로 자동 서버 재시작
- **수동 반영**: 필요 없음

### 2. 패키지 의존성 변경 (package.json)
```bash
# 컨테이너 내부에서 새 패키지 설치
./dev.sh shell
pnpm install

# 또는 호스트에서 설치 후 컨테이너 재시작
pnpm add <package-name>
docker compose restart app
```

### 3. 환경 설정 파일 변경
```bash
# .env, docker-compose.yaml 등 변경 시
docker compose restart app

# 또는 전체 재시작
docker compose down && docker compose up -d
```

### 4. Docker 설정 변경 (Dockerfile)
```bash
# 이미지 재빌드 필요
docker compose up --build -d
```

## GitHub 앱 통합

### GitHub 앱 설정

1. **GitHub App 생성**
   - GitHub에서 새 GitHub App 생성
   - Webhook URL: `https://your-domain.com/api/integrations/github/webhook`
   - Callback URL: `https://your-domain.com/api/integrations/github/install/callback`

2. **환경 변수 설정**
   ```bash
   GITHUB_APP_ID="your-github-app-id"
   GITHUB_APP_NAME="otto-handler"
   GITHUB_APP_PRIVATE_KEY="your-github-app-private-key"
   GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
   FRONTEND_URL="http://localhost:3000"
   BACKEND_URL="http://localhost:3001"
   ```

### API 엔드포인트

#### 1. GitHub 앱 설치 URL 조회
```http
GET /api/integrations/github/install/url
Authorization: Bearer <token>
```

#### 2. GitHub 앱 등록
```http
POST /api/integrations/github/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "installationId": "string",
  "accessToken": "string"
}
```

#### 3. 브랜치 목록 조회
```http
GET /api/integrations/github/branches?repo=owner/repo
Authorization: Bearer <token>
```

#### 4. 브랜치 등록
```http
POST /api/integrations/github/branches
Authorization: Bearer <token>
Content-Type: application/json

{
  "repo": "owner/repo",
  "branch": "main"
}
```

#### 5. GitHub Webhook (내부용)
```http
POST /api/integrations/github/webhook
X-GitHub-Event: installation
```

### 프론트엔드 연동 예시

```typescript
// 1. GitHub 앱 설치 URL 조회
const { installUrl } = await fetch('/api/integrations/github/install/url', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// 2. GitHub 앱 설치 페이지로 이동
window.open(installUrl, '_blank');

// 3. 설치 완료 후 URL 파라미터 확인
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('github_installed') === 'true') {
  const installationId = urlParams.get('installation_id');
  // GitHub 앱 등록 API 호출
  await fetch('/api/integrations/github/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId, accessToken })
  });
}
```

## 프로덕션 배포

```bash
docker compose up -d
```