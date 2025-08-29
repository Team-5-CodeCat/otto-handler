# Otto Handler

NestJS 기반 애플리케이션

## 개발 환경 설정

### 필수 요구사항
- Node.js 22.x
- pnpm 9.x
- Docker & Docker Compose

### 설정 방법

1. **Node.js 버전 설정** (nvm 사용시)
```bash
nvm use
```

2. **의존성 설치**
```bash
pnpm install
```

3. **환경변수 설정**
```bash
cp .env.example .env
```

4. **데이터베이스 실행**
```bash
docker compose up -d postgres redis
```

5. **개발 서버 실행**
```bash
pnpm run start:dev
```

### 사용 가능한 명령어
- `pnpm run start:dev`: 개발 서버 (핫 리로드)
- `pnpm run build`: 프로덕션 빌드
- `pnpm run test`: 테스트 실행
- `pnpm run lint`: 코드 스타일 검사

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

### 로그 확인
```bash
docker compose logs app -f          # 실시간 로그
docker compose logs app --tail=50   # 최근 50줄
```

### 서버 재시작
```bash
docker compose restart app          # app 컨테이너만 재시작
```

### 컨테이너 접속
```bash
docker compose exec app sh          # 컨테이너 내부 접속
```

## 프로덕션 배포

```bash
docker compose up -d
```