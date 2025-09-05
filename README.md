# Otto Handler

NestJS 기반 애플리케이션

## 개발 환경 설정

### 필수 요구사항
- Node.js 22.x
- pnpm 9.x
- PostgreSQL (로컬 설치 필요)
- Redis (선택사항)

### 빠른 시작

1. **의존성 설치**
```bash
pnpm install
```

2. **환경변수 설정**
```bash
cp .env.example .env
# .env 파일에서 DATABASE_URL을 로컬 PostgreSQL로 수정
```

3. **데이터베이스 설정**
```bash
# Prisma 클라이언트 생성
pnpm prisma generate

# 데이터베이스 마이그레이션
pnpm prisma migrate dev
```

4. **개발 서버 시작**
```bash
pnpm run start:dev
```

### 개발 워크플로우

1. `pnpm install` - 의존성 설치
2. `pnpm prisma generate` - Prisma 클라이언트 생성
3. `pnpm prisma migrate dev` - 데이터베이스 마이그레이션
4. `pnpm run start:dev` - 개발 서버 시작 (핫 리로드)

### 다중 개발자 환경 (6명 동시 개발)

각 개발자는 서로 다른 포트에서 독립적인 개발환경을 구성할 수 있습니다.

**개발자별 포트 할당:**
- 한진우: PostgreSQL 5432, Redis 6379, NestJS 4000
- 장준영: PostgreSQL 5433, Redis 6380, NestJS 4001  
- 이지윤: PostgreSQL 5434, Redis 6381, NestJS 4002
- 고민지: PostgreSQL 5435, Redis 6382, NestJS 4003
- 김보아: PostgreSQL 5436, Redis 6383, NestJS 4004
- 유호준: PostgreSQL 5437, Redis 6384, NestJS 4005

**개발자별 .env 설정 예시 (장준영):**
```bash
PORT=4001
NODE_ENV=development
COOKIE_SECRET=jangjunyeong-cookie-secret-key-for-development
DATABASE_URL="postgresql://postgres:password@localhost:5433/otto_handler?schema=public"
REDIS_URL=redis://localhost:6380
```

**자동 설정 스크립트 (권장):**
```bash
# 개발환경 자동 설정 (개발자 이름 입력 후 자동으로 포트 할당 및 컨테이너 실행)
./setup-dev-env.sh
# 실행 후 개발자 이름 입력: 한진우, 장준영, 이지윤, 고민지, 김보아, 유호준 중 하나
```

**수동 설정 (개발자별 데이터베이스/Redis 컨테이너 실행):**
```bash
# PostgreSQL 컨테이너 (장준영 예시)
docker run -d --name postgres-jangjunyeong -p 5433:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=otto_handler postgres:15

# Redis 컨테이너 (장준영 예시)  
docker run -d --name redis-jangjunyeong -p 6380:6379 redis:7-alpine

# 컨테이너 관리 명령어
docker stop postgres-jangjunyeong redis-jangjunyeong  # 중지
docker rm postgres-jangjunyeong redis-jangjunyeong    # 삭제
```

**🚀 개발자 온보딩 과정 (완전 자동화):**
```bash
# 1. 자동 설정 실행 (권장) - 모든 환경이 자동 구성됩니다
./setup-dev-env.sh
# → 개발자 이름 입력: 한진우/장준영/이지윤/고민지/김보아/유호준
# 자동 실행: PostgreSQL + Redis 컨테이너 생성, .env 파일 생성, 포트 할당

# 2. 의존성 설치
pnpm install

# 3. 데이터베이스 마이그레이션 (DB 컨테이너 실행 중인 상태에서)
pnpm prisma migrate dev
# ✅ DB를 껐다 켤 필요 없음! 실행 중인 상태에서 스키마 변경

# 4. 개발 서버 시작
pnpm run start:dev
```

**❓ 자주 묻는 질문:**
- **Q: DB 마이그레이션 시 컨테이너를 재시작해야 하나요?**
  - A: ❌ 아니요! DB 컨테이너가 실행 중인 상태에서 바로 `pnpm prisma migrate dev` 실행하면 됩니다.

- **Q: setup-dev-env.sh는 무엇을 자동으로 해주나요?**  
  - A: ✅ Docker 컨테이너 생성/실행 + .env 파일 생성 + 포트 할당을 모두 자동화합니다.

- **Q: 다른 개발자와 포트 충돌이 나지 않나요?**
  - A: ✅ 각 개발자별로 고유한 포트가 자동 할당되므로 충돌하지 않습니다.

**🔧 컨테이너 관리 명령어:**
```bash
# 컨테이너 상태 확인
docker ps -a

# 장준영 예시 - 컨테이너 관리
docker stop postgres-jangjunyeong redis-jangjunyeong   # 컨테이너 중지
docker start postgres-jangjunyeong redis-jangjunyeong  # 컨테이너 재시작  
docker rm postgres-jangjunyeong redis-jangjunyeong     # 컨테이너 삭제

# 개발자별 컨테이너 이름 규칙
# 한진우: postgres-hanjinwoo, redis-hanjinwoo
# 장준영: postgres-jangjunyeong, redis-jangjunyeong
# 이지윤: postgres-leejiyoon, redis-leejiyoon
# 고민지: postgres-gominji, redis-gominji
# 김보아: postgres-kimboa, redis-kimboa
# 유호준: postgres-yoohojun, redis-yoohojun
```

**🔍 데이터베이스 관리:**
```bash
# Prisma Studio로 데이터베이스 내용 확인 (GUI)
pnpm prisma studio

# 스키마 변경 시 (schema.prisma 수정 후)
pnpm prisma migrate dev    # 새 마이그레이션 생성 및 적용

# 데이터베이스 리셋 (⚠️ 모든 데이터 삭제)
pnpm prisma migrate reset
```

**🚨 주의사항:**
- **컨테이너 삭제 시**: 해당 컨테이너의 모든 데이터가 삭제됩니다
- **마이그레이션**: DB 컨테이너가 실행 중인 상태에서만 가능합니다
- **포트 충돌**: 각자 할당받은 포트만 사용해주세요

### 서비스 포트
- 한진우: http://localhost:4000 (Swagger: http://localhost:4000/docs)
- 장준영: http://localhost:4001 (Swagger: http://localhost:4001/docs)
- 이지윤: http://localhost:4002 (Swagger: http://localhost:4002/docs)
- 고민지: http://localhost:4003 (Swagger: http://localhost:4003/docs)
- 김보아: http://localhost:4004 (Swagger: http://localhost:4004/docs)
- 유호준: http://localhost:4005 (Swagger: http://localhost:4005/docs)

## 새로운 라이브러리 설치

```bash
# 패키지 설치
pnpm add @package-name

# 개발 의존성 설치
pnpm add -D @package-name
```

## 개발 도구

### 주요 명령어
```bash
# 개발 서버 시작 (핫 리로드)
pnpm run start:dev

# 빌드
pnpm run build

# 테스트
pnpm test
pnpm test:e2e

# 린팅 및 포매팅
pnpm run lint
pnpm run format

# 데이터베이스 마이그레이션 관련
pnpm run db:generate    # Prisma 클라이언트 생성
pnpm run db:migrate     # 새 마이그레이션 생성 및 적용
pnpm run db:studio      # 데이터베이스 GUI 실행
pnpm run db:reset       # 데이터베이스 리셋 (모든 데이터 삭제 주의!)
pnpm run db:deploy      # 프로덕션 마이그레이션 적용
pnpm run db:seed        # 데이터베이스 시드 데이터 삽입

# 직접 Prisma 명령어 사용 시
pnpm prisma generate    # 클라이언트 생성
pnpm prisma migrate dev # 마이그레이션
pnpm prisma studio      # GUI 실행
pnpm prisma migrate reset # 리셋
```

### 데이터베이스 작업 워크플로우

#### 1. 스키마 변경 후 마이그레이션
```bash
# 1. schema.prisma 파일 수정
# 2. 마이그레이션 생성 및 적용
pnpm run db:migrate
# 또는 직접 명령어
pnpm prisma migrate dev --name "설명적인_마이그레이션_이름"

# 3. Prisma 클라이언트 재생성 (자동으로 실행됨)
# 수동으로 하려면: pnpm run db:generate
```

#### 2. 데이터베이스 초기화 (개발 환경)
```bash
# 모든 데이터 삭제 후 최신 스키마로 재설정
pnpm run db:reset

# 시드 데이터 삽입 (있는 경우)
pnpm run db:seed
```

#### 3. 데이터베이스 상태 확인
```bash
# GUI로 데이터 확인
pnpm run db:studio

# 마이그레이션 상태 확인
pnpm prisma migrate status
```

#### 4. 프로덕션 배포용 마이그레이션
```bash
# 프로덕션 환경에서 마이그레이션 적용
pnpm run db:deploy
```

## 코드 변경 시 반영 방법

### 1. 소스 코드 변경 (TypeScript 파일)
- **자동 반영**: `pnpm run start:dev` 실행 중이면 파일 저장 시 핫 리로드로 자동 서버 재시작

### 2. 패키지 의존성 변경 (package.json)
```bash
pnpm install
# 개발 서버 재시작
```

### 3. 환경 설정 파일 변경 (.env)
```bash
# 개발 서버 재시작 필요
```

### 4. Prisma 스키마 변경
```bash
pnpm prisma generate
pnpm prisma migrate dev
```