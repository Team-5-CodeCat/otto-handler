# Otto Handler

NestJS 기반 CI/CD 자동화 플랫폼의 백엔드 API 서버입니다.

## 🎯 프로젝트 개요

Otto Handler는 팀과 개발자를 위한 간단하고 효율적인 CI/CD 파이프라인 자동화 플랫폼의 핵심 백엔드 서비스입니다.

### 핵심 기능
- **사용자 인증**: JWT 기반 인증 시스템
- **프로젝트 관리**: GitHub 레포지토리 연동
- **파이프라인 관리**: 빌드/테스트/배포 워크플로우 정의 및 실행
- **환경 설정**: 언어별, 배포 환경별 설정 관리
- **통합 서비스**: GitHub, AWS S3 연동

## 🛠️ 기술 스택

- **Framework**: NestJS with Fastify adapter
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens, bcrypt
- **API Documentation**: Nestia + Swagger
- **Type Safety**: TypeScript with typia runtime validation
- **Development**: Direct Node.js execution on EC2

## 🚀 빠른 시작

### 자동 개발환경 설정 (권장)

```bash
# 1. 개발환경 자동 설정
./setup-dev-env.sh
# 개발자 이름 입력: 한진우, 장준영, 이지윤, 고민지, 김보아, 유호준

# 2. 의존성 설치
pnpm install

# 3. 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 4. 개발 서버 시작
pnpm run start:dev
```

### 개발자별 포트 할당

| 개발자 | PostgreSQL | Redis | NestJS | Swagger |
|--------|-----------|-------|---------|---------|
| 한진우 | 5432 | 6379 | 4000 | [localhost:4000/docs](http://localhost:4000/docs) |
| 장준영 | 5433 | 6380 | 4001 | [localhost:4001/docs](http://localhost:4001/docs) |
| 이지윤 | 5434 | 6381 | 4002 | [localhost:4002/docs](http://localhost:4002/docs) |
| 고민지 | 5435 | 6382 | 4003 | [localhost:4003/docs](http://localhost:4003/docs) |
| 김보아 | 5436 | 6383 | 4004 | [localhost:4004/docs](http://localhost:4004/docs) |
| 유호준 | 5437 | 6384 | 4005 | [localhost:4005/docs](http://localhost:4005/docs) |

## 📋 주요 명령어

### 개발 워크플로우
```bash
pnpm run start:dev        # 개발 서버 (핫 리로드)
pnpm run build           # 프로덕션 빌드
pnpm run start:prod      # 프로덕션 서버
```

### 데이터베이스 관리
```bash
pnpm prisma generate     # Prisma 클라이언트 생성
pnpm prisma migrate dev  # 개발 마이그레이션
pnpm prisma studio       # 데이터베이스 GUI
pnpm prisma migrate reset # 데이터베이스 초기화 (⚠️ 데이터 삭제)
pnpm run db:seed         # 시드 데이터 삽입
```

### 코드 품질
```bash
pnpm run lint            # ESLint 검사
pnpm run format          # Prettier 포맷팅
pnpm test                # 단위 테스트
pnpm test:e2e            # E2E 테스트
pnpm test:cov            # 테스트 커버리지
```

## 🏗️ 아키텍처

### 모듈 구조
```
src/
├── auth/           # JWT 인증, 리프레시 토큰
├── user/           # 사용자 관리
├── projects/       # 프로젝트, GitHub 연동
├── pipelines/      # CI/CD 파이프라인 관리
├── environments/   # 환경 설정 (언어, 배포)
├── integrations/   # 외부 서비스 연동
├── database/       # Prisma 설정
└── common/         # 공통 유틸리티
```

### 데이터 구조
```
User → Project → Pipeline → PipelineRun → Job → Log/Error/StatusEvent
```

### 핵심 패턴
- **모듈 기반**: 도메인 주도 설계
- **DTO 검증**: typia 런타임 검증
- **타입 안전성**: Nestia SDK 자동 생성
- **트랜잭션**: 복합 데이터베이스 작업
- **가드/인터셉터**: 인증/로깅/변환

## 🔧 개발 환경

### 공유 리소스

**Redis 컨테이너**: `redis-{개발자영문명}`
- otto-handler에서 캐싱 및 세션 관리 사용
- 자동 생성/재사용 로직 적용

**PostgreSQL 컨테이너**: `postgres-{개발자ID}`
- 개발자별 독립 데이터베이스
- 완전한 스키마 격리

### 환경 설정

자동 생성되는 `.env` 파일 예시:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:password@localhost:5432/otto_handler?schema=public"
REDIS_URL=redis://localhost:6379
COOKIE_SECRET=hanjinwoo-cookie-secret-key-for-development
```

## 🔗 연동 프로젝트

### Otto Frontend
- **포트**: 3000-3005
- **API 통신**: Nestia 생성 SDK 사용
- **인증**: JWT 토큰 기반


## 📊 데이터베이스

### Prisma 스키마 하이라이트

**핵심 엔티티**:
- `User`: 사용자 인증 및 프로젝트 소유권
- `Project`: GitHub 레포지토리 연결, 웹훅 URL
- `Pipeline`: 빌드/테스트/배포 워크플로우 정의
- `Job`: 개별 작업 (BUILD/TEST/DEPLOYMENT) with 재시도 로직
- `Environment`: 언어 및 배포 설정

**고급 기능**:
- 포괄적 enum 타입 (JobStatus, Language, DeploymentEnvironment)
- 관계형 조인 최적화 (relationJoins 프리뷰)
- UUID/ULID 기반 ID 시스템
- 적절한 인덱스 및 제약조건

### 마이그레이션 워크플로우

```bash
# 1. schema.prisma 수정
# 2. 마이그레이션 생성
pnpm prisma migrate dev --name "descriptive_migration_name"
# 3. Prisma 클라이언트 자동 재생성
```

## 🧪 테스팅

### 테스트 전략
- **Unit Tests**: 서비스 로직 테스트
- **E2E Tests**: API 엔드포인트 테스트
- **Database Tests**: Prisma 작업 테스트

### 실행 방법
```bash
jest path/to/test.spec.ts    # 특정 테스트
pnpm test:watch              # 워치 모드
pnpm test:debug              # 디버그 모드
```

## 🔒 보안

### 인증 시스템
- JWT access/refresh 토큰
- bcrypt 패스워드 해싱
- 역할 기반 접근 제어 (RBAC)

### 데이터 보호
- 환경 변수로 시크릿 관리
- 입력 검증 (typia)
- SQL 인젝션 방지 (Prisma)
- 적절한 CORS 설정

## 🚦 API 문서

개발 서버 실행 후 Swagger UI 접속:
- **한진우**: http://localhost:4000/docs
- **장준영**: http://localhost:4001/docs  
- **이지윤**: http://localhost:4002/docs
- **고민지**: http://localhost:4003/docs
- **김보아**: http://localhost:4004/docs
- **유호준**: http://localhost:4005/docs

## 💡 개발 팁

### Hot Reload
- 소스 코드 변경 시 자동 재시작
- Prisma 스키마 변경 시 마이그레이션 필요

### 데이터베이스 작업
- 스키마 변경은 반드시 마이그레이션으로
- Prisma Studio로 데이터 시각화
- 트랜잭션으로 복합 작업 처리

### 디버깅
- NestJS 로거 활용
- Prisma 쿼리 로깅 활성화
- Jest 디버그 모드 사용

## 🛠️ 문제 해결

### 컨테이너 관리
```bash
# 상태 확인
docker ps -f name=hanjinwoo

# 재시작
docker restart postgres-hanjinwoo redis-hanjinwoo

# 로그 확인  
docker logs postgres-hanjinwoo
```

### 포트 충돌
- 할당된 포트 확인 후 수정
- 다른 개발자와 포트 중복 없는지 확인

### 데이터베이스 이슈
- 마이그레이션 상태: `pnpm prisma migrate status`
- 연결 테스트: `pnpm prisma db pull`
- 스키마 동기화: `pnpm prisma db push`

## 📚 추가 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 문서](https://www.prisma.io/docs/)
- [Nestia 가이드](https://nestia.io/)
- [프로젝트 CLAUDE.md](../CLAUDE.md) - AI 어시스턴트 가이드

---

**Otto Handler는 효율적이고 안전한 CI/CD 자동화를 위한 핵심 백엔드 서비스입니다.**