# Otto Handler

<div align="center">
  <h3>🚀 NestJS 기반 CI/CD 자동화 플랫폼</h3>
  <p>팀과 개발자를 위한 간단하고 효율적인 빌드 파이프라인 플랫폼</p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

## 📢 최신 업데이트 (2025.09.11)

### 🔐 GitHub OAuth 전용 인증 시스템 전환 완료
- ✅ Password 기반 인증 완전 제거
- ✅ 모든 사용자는 GitHub 계정으로만 로그인
- ✅ 필드명 camelCase 통일 (userID → userId)
- ✅ TriggerType enum 수정 (PUSH 제거, WEBHOOK 사용)
- ✅ 21개 API 엔드포인트 통신 테스트 완료

### 🛠️ 주요 변경사항
- `User` 모델에서 `password` 필드 제거
- `Session` 모델로 RefreshToken 관리
- GitHub App 설치를 통한 레포지토리 접근
- 모든 ID 필드 camelCase로 통일

## 🎯 프로젝트 개요

Otto Handler는 GitHub과 완전히 통합된 현대적인 CI/CD 자동화 플랫폼의 핵심 백엔드 서비스입니다. 복잡한 DevOps 설정 없이도 개발팀이 빠르고 안전하게 빌드, 테스트, 배포 파이프라인을 구축할 수 있도록 설계되었습니다.

### ✨ 핵심 기능

- 🔐 **GitHub OAuth 전용 인증**: Password 인증 제거, GitHub 계정으로만 로그인
- 🔗 **GitHub 통합**: GitHub App을 통한 완전한 저장소 연동
- ⚡ **실시간 파이프라인**: 빌드/테스트/배포 워크플로우 실시간 실행
- 🎛️ **환경 관리**: 언어별, 배포 환경별 세밀한 설정 제어
- 📊 **상세 로깅**: 실행 단계별 완전한 추적 및 디버깅
- 🔄 **재시도 로직**: 실패한 작업 자동 재시도 (최대 3회)
- 💾 **아티팩트 저장**: S3 기반 빌드 결과물 및 로그 저장

## 🛠️ 기술 스택

### 🏗️ 백엔드 아키텍처

- **Framework**: NestJS with Fastify adapter (고성능)
- **Database**: PostgreSQL with Prisma ORM (타입 안전성)
- **Cache**: Redis (세션 및 고속 데이터 액세스)
- **Authentication**: GitHub OAuth + JWT (password 인증 제거)
- **API**: Nestia (타입 안전 SDK 자동 생성) + Swagger
- **Validation**: typia (런타임 타입 검증)
- **Language**: TypeScript (Strict 모드)

### 🔧 DevOps & 배포

- **Deployment**: EC2 Direct execution (Docker 미사용)
- **Process Manager**: PM2 (프로덕션 프로세스 관리)
- **Environment**: 환경별 설정 파일 (.env.dev, .env.prod, .env.test)
- **Database Migration**: Prisma migrate (안전한 스키마 변경)
- **Package Manager**: pnpm (빠른 의존성 관리)

## 🚀 빠른 시작

### 📋 요구사항

- **Node.js**: 22+ (LTS 권장)
- **pnpm**: 9+ (Package Manager)
- **PostgreSQL**: 13+ (로컬 또는 원격)
- **Redis**: 6+ (캐싱 및 세션)

### ⚡ 1분 설정

```bash
# 1. 저장소 클론
git clone <repository-url>
cd otto-handler

# 2. 의존성 설치 (Prisma 클라이언트 자동 생성)
pnpm install

# 3. 환경 설정 복사 및 수정
cp .env.example .env.dev
# POSTGRESQL_URL, REDIS_URL, GitHub App 정보 설정

# 4. 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 5. 개발 서버 시작 🎉
pnpm run start:dev
```

### 🌐 접속 정보

서버 실행 후 다음 URL에서 서비스 접근:

- **API 서버**: http://localhost:4000
- **Swagger 문서**: http://localhost:4000/docs
- **Health Check**: http://localhost:4000/health
- **Prisma Studio**: `pnpm prisma studio` (http://localhost:5555)

## 📋 개발 명령어

### 🔄 개발 워크플로우

```bash
# 개발 서버 (Hot Reload)
pnpm run start:dev

# 디버그 모드
pnpm run start:debug

# 프로덕션 빌드
pnpm run build

# 프로덕션 서버
pnpm run start:prod
```

### 🗄️ 데이터베이스 관리

```bash
# Prisma 클라이언트 생성
pnpm prisma generate

# 개발 마이그레이션 (스키마 변경 시)
pnpm prisma migrate dev --name "migration_name"

# 프로덕션 마이그레이션 배포
pnpm prisma migrate deploy

# 데이터베이스 GUI (추천 🌟)
pnpm prisma studio

# 마이그레이션 상태 확인
pnpm prisma migrate status

# ⚠️ 데이터베이스 완전 초기화 (개발용)
pnpm prisma migrate reset
```

### 🎨 코드 품질 & 테스트

```bash
# 린팅 (자동 수정)
pnpm run lint

# 코드 포맷팅
pnpm run format

# 단위 테스트
pnpm test

# 테스트 워치 모드
pnpm test:watch

# E2E 테스트
pnpm test:e2e

# 커버리지 리포트
pnpm test:cov

# 특정 테스트 파일 실행
jest src/auth/auth.service.spec.ts
```

### 🔧 Nestia SDK 관리

```bash
# 타입 안전 SDK 생성
pnpm nestia sdk

# Swagger 문서 생성
pnpm nestia swagger

# SDK + Swagger 동시 생성
pnpm nestia build
```

## 🏗️ 시스템 아키텍처

### 📁 모듈 구조

```
src/
├── 🔐 auth/              # JWT 인증, Refresh Token, 보안
├── 👤 user/              # 사용자 관리, 프로필, 권한
├── 📂 projects/          # 프로젝트 관리, GitHub 저장소 연동
├── ⚡ pipelines/         # CI/CD 파이프라인 정의 및 실행
├── 🌍 environments/      # 배포 환경 설정 (NODE, PYTHON, EC2)
├── 🔗 webhooks/          # GitHub 웹훅 이벤트 처리
├── 🗄️ database/          # Prisma ORM 설정 및 서비스
├── 🛠️ common/            # 공통 유틸리티, 가드, 파이프, 필터
└── 🧩 modules/           # 추가 기능 모듈
```

### 🔄 데이터 흐름

```mermaid
graph TD
    A[User] --> B[Project]
    B --> C[Pipeline]
    C --> D[PipelineRun]
    D --> E[Job]
    E --> F[Log]
    E --> G[JobError]
    E --> H[JobStatusEvent]

    B --> I[ProjectRepository]
    B --> J[Environment]

    A --> K[RefreshToken]
    A --> L[GithubInstallation]
```

### 🎯 핵심 설계 패턴

#### 🏛️ Domain-Driven Design (DDD)

- **모듈별 완전 격리**: 각 모듈은 독립적인 도메인 로직
- **계층형 아키텍처**: Controller → Service → Repository
- **의존성 주입**: NestJS IoC 컨테이너 활용

#### 🔒 보안 우선 설계

- **JWT Strategy**: Access (15분) + Refresh Token (30일)
- **Guard 기반 보호**: 경로별 세밀한 권한 제어
- **입력 검증**: typia를 통한 런타임 타입 안전성

#### ⚡ 성능 최적화

- **Fastify Adapter**: Express 대비 2배 빠른 성능
- **relationJoins**: Prisma N+1 문제 해결
- **Redis 캐싱**: 자주 조회되는 데이터 캐싱
- **인덱스 최적화**: 모든 검색 조건에 최적화된 인덱스

#### 🔧 개발자 경험 (DX)

- **타입 안전성**: 컴파일 타임 + 런타임 모두 보장
- **자동 문서화**: Nestia로 SDK + Swagger 자동 생성
- **Hot Reload**: 개발 중 즉시 반영
- **강력한 개발 도구**: Prisma Studio, ESLint, Prettier

## 🔧 환경 설정

### 📄 환경 파일 구성

Otto Handler는 환경별로 분리된 설정 파일을 사용합니다:

```
├── .env.example          # 템플릿 파일
├── .env.dev             # 개발 환경
├── .env.test            # 테스트 환경
└── .env.prod            # 프로덕션 환경
```

### ⚙️ 필수 환경 변수

```bash
# 🚀 서버 설정
OTTO_HANDLER_SERVER_PORT=4000
NODE_ENV=development
COOKIE_SECRET=your-secure-cookie-secret

# 🗄️ 데이터베이스
POSTGRESQL_URL="postgresql://user:password@localhost:5432/otto_handler"

# 🔴 Redis 캐시
REDIS_URL="redis://localhost:6379"

# 🔐 JWT 보안
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# 🐙 GitHub App 연동
OTTO_GITHUB_APP_ID=123456
OTTO_GITHUB_APP_NAME=your-github-app
OTTO_GITHUB_WEBHOOK_SECRET=webhook-secret
OTTO_GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# 🌐 CORS 설정
FRONTEND_URL=http://localhost:3000
```

### 🐋 로컬 개발 (Docker 옵션)

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
# PostgreSQL + Redis 컨테이너 자동 설정
python3 simple-dev-setup.py

# 또는 수동 Docker 실행
docker run -d --name postgres-otto \
  -e POSTGRES_DB=otto_handler \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:15

docker run -d --name redis-otto \
  -p 6379:6379 redis:7-alpine
```

## 🔗 생태계 연동

### 🎨 Otto Frontend

- **기술 스택**: Next.js 14, TypeScript, Tailwind CSS
- **포트**: 3000 (개발), 443 (프로덕션)
- **API 통신**: Nestia 자동 생성 SDK 사용
- **인증**: JWT Bearer Token + httpOnly Refresh Cookie
- **실시간**: WebSocket을 통한 파이프라인 상태 업데이트

### 🐙 GitHub 통합

- **GitHub App**: OAuth가 아닌 GitHub App 방식
- **권한**: Repository contents, Pull requests, Webhooks
- **이벤트**: Push, Pull Request, Branch 생성/삭제
- **보안**: 각 설치별 독립적인 토큰 관리

### ☁️ AWS 서비스

- **S3**: 빌드 아티팩트 및 로그 저장
- **EC2**: 직접 Node.js 실행 환경
- **Route 53**: 도메인 관리
- **Certificate Manager**: SSL/TLS 인증서

### 📊 모니터링 & 로깅

- **Winston**: 구조화된 로그 관리
- **Prisma Metrics**: 데이터베이스 성능 모니터링
- **Health Check**: `/health` 엔드포인트
- **Graceful Shutdown**: SIGTERM 시그널 처리

## 📊 데이터베이스 설계

### 🗄️ Prisma 스키마 핵심

#### 📋 주요 엔티티

| 엔티티          | 설명                     | 주요 필드                               |
| --------------- | ------------------------ | --------------------------------------- |
| **User**        | 사용자 인증 및 권한      | `email`, `password`, `memberRole`       |
| **Project**     | GitHub 저장소 연결       | `name`, `webhookUrl`, `userID`          |
| **Pipeline**    | CI/CD 워크플로우 정의    | `pipelineSpec`, `version`, `active`     |
| **PipelineRun** | 파이프라인 실행 인스턴스 | `status`, `trigger`, `metadata`         |
| **Job**         | 개별 작업 단위           | `type`, `status`, `attemptCurrent`      |
| **Environment** | 배포 환경 설정           | `language`, `deployEnv`, `envVariables` |

#### 🔢 중요한 열거형 (Enums)

```prisma
enum JobStatus {
  pending    // 대기 중
  running    // 실행 중
  completed  // 완료
  failed     // 실패
  cancelled  // 취소
}

enum JobType {
  BUILD      // 빌드 작업
  TEST       // 테스트 작업
  DEPLOYMENT // 배포 작업
}

enum Language {
  NODE       // Node.js 프로젝트
  PYTHON     // Python 프로젝트
}

enum DeployEnvironment {
  EC2        // AWS EC2 배포
}
```

#### 🚀 고급 기능

- **🔗 relationJoins**: N+1 쿼리 문제 자동 해결
- **🏷️ UUID 기반 ID**: 예측 불가능한 안전한 식별자
- **📊 인덱스 최적화**: 모든 검색 패턴에 최적화
- **🔄 Cascade 삭제**: 데이터 일관성 자동 보장
- **⏰ 타임스탬프**: 생성/수정 시간 자동 추적

### 🔄 마이그레이션 전략

```bash
# 📝 1. 스키마 수정 (schema.prisma)
# 예: 새로운 필드 추가, 관계 변경 등

# 🚀 2. 마이그레이션 생성 및 적용
pnpm prisma migrate dev --name "add_pipeline_timeout_field"

# ✅ 3. 프로덕션 배포 (CI/CD에서 자동)
pnpm prisma migrate deploy

# 🔍 4. 마이그레이션 상태 확인
pnpm prisma migrate status
```

### 📈 성능 최적화

#### 인덱스 전략

```sql
-- 자주 검색되는 필드 조합
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);
CREATE INDEX idx_pipeline_runs_pipeline_created ON pipeline_runs(pipeline_id, created_at);
CREATE INDEX idx_users_email ON users(email); -- 로그인 최적화
```

#### 쿼리 최적화 예시

```typescript
// ❌ N+1 문제 발생
const users = await prisma.user.findMany();
for (const user of users) {
  user.projects = await prisma.project.findMany({
    where: { userID: user.userID },
  });
}

// ✅ 단일 쿼리로 최적화
const users = await prisma.user.findMany({
  include: {
    projects: {
      include: { pipelines: true },
    },
  },
});
```

## 🧪 테스트 전략

### 🎯 테스트 피라미드

```
        🔺 E2E Tests (Few)
       API Integration Tests
      🔹 Unit Tests (Many)
     Service Logic, Utils
```

#### 📊 테스트 범위

| 테스트 유형     | 목적            | 도구           | 커버리지 목표    |
| --------------- | --------------- | -------------- | ---------------- |
| **Unit**        | 비즈니스 로직   | Jest + Mocking | 80%+             |
| **Integration** | API 엔드포인트  | Supertest      | 주요 플로우 100% |
| **E2E**         | 전체 워크플로우 | Jest + Test DB | 핵심 시나리오    |

### 🛠️ 테스트 환경 설정

```bash
# 테스트 전용 환경변수
NODE_ENV=test
POSTGRESQL_URL="postgresql://postgres:password@localhost:5432/otto_handler_test"

# 테스트 DB 초기화
pnpm prisma migrate reset --force
pnpm prisma migrate deploy
```

### 📝 테스트 작성 예시

#### Unit Test (서비스 로직)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('should return JWT tokens for valid credentials', async () => {
      // Given
      const loginDto = { email: 'test@example.com', password: 'password123' };

      // When
      const result = await service.login(loginDto);

      // Then
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });
});
```

#### E2E Test (API 통합)

```typescript
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 인증 토큰 획득
    authToken = await getTestAuthToken(app);
  });

  it('POST /projects should create new project', () => {
    return request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Project', repoUrl: 'github.com/user/repo' })
      .expect(201)
      .expect((res) => {
        expect(res.body.projectID).toBeDefined();
        expect(res.body.name).toBe('Test Project');
      });
  });
});
```

### 📊 테스트 실행 & 리포팅

```bash
# 🎯 단위 테스트 (빠른 피드백)
pnpm test

# 👀 워치 모드 (개발 중)
pnpm test:watch

# 🔍 특정 테스트 파일
jest auth.service.spec.ts

# 🌐 E2E 테스트 (전체 플로우)
pnpm test:e2e

# 📈 커버리지 리포트
pnpm test:cov

# 🐛 디버그 모드
pnpm test:debug
```

### 🎭 모킹 전략

```typescript
// GitHub API 모킹
const mockGitHubService = {
  getRepositories: jest.fn().mockResolvedValue(mockRepos),
  createWebhook: jest.fn().mockResolvedValue({ id: 'webhook-123' }),
};

// Prisma 모킹 (단위 테스트용)
const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
```

## 🔒 보안 체계

### 🛡️ 인증 & 인가

#### JWT 토큰 전략

```typescript
// Access Token (짧은 수명)
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "MEMBER",
  "iat": 1640995200,
  "exp": 1640996100  // 15분 후 만료
}

// Refresh Token (긴 수명)
{
  "sub": "user-uuid",
  "tokenId": "refresh-token-uuid",
  "iat": 1640995200,
  "exp": 1643587200  // 30일 후 만료
}
```

#### 역할 기반 접근 제어 (RBAC)

```typescript
enum MemberRole {
  ADMIN   // 전체 시스템 관리
  MEMBER  // 일반 사용자 권한
  VIEWER  // 읽기 전용 권한
}

// Guard 사용 예시
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(MemberRole.ADMIN)
@TypedRoute.Delete(':id')
async deleteUser(@Param('id') id: string) {
  // ADMIN만 접근 가능
}
```

### 🔐 데이터 보호

#### 비밀번호 보안

```typescript
// bcrypt 해싱 (saltRounds: 12)
const hashedPassword = await bcrypt.hash(plainPassword, 12);

// 패스워드 정책 검증
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

#### 입력 검증 (typia)

```typescript
// 런타임 타입 검증
export const CreateUserDto = {
  email: (input: string): string => {
    if (!typia.is<string>(input) || !isEmail(input)) {
      throw new BadRequestException('Invalid email format');
    }
    return input;
  },
  password: (input: string): string => {
    if (!passwordRegex.test(input)) {
      throw new BadRequestException('Password does not meet requirements');
    }
    return input;
  },
};
```

### 🌐 네트워크 보안

#### CORS 설정

```typescript
app.enableCors({
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://codecat-otto.shop']
      : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
});
```

#### 쿠키 보안

```typescript
// httpOnly, secure 쿠키
response.cookie('refreshToken', token, {
  httpOnly: true, // XSS 방지
  secure: NODE_ENV === 'production', // HTTPS only
  sameSite: 'strict', // CSRF 방지
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
});
```

### 🐙 GitHub 통합 보안

```typescript
// GitHub App 토큰 관리
class GitHubTokenManager {
  async getInstallationToken(installationId: string) {
    // 토큰 만료 시간 확인
    const installation = await this.getInstallation(installationId);

    if (this.isTokenExpired(installation.tokenExpiresAt)) {
      // 자동 토큰 갱신
      return this.refreshInstallationToken(installationId);
    }

    return installation.accessToken;
  }
}
```

### 🚨 보안 모니터링

```typescript
// 실패한 로그인 시도 추적
@Injectable()
export class SecurityService {
  async trackFailedLogin(email: string, ip: string) {
    const key = `failed_login:${email}:${ip}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 900); // 15분 TTL
    }

    if (attempts >= 5) {
      // 계정 일시 잠금 또는 알림
      await this.notifySecurityTeam({ email, ip, attempts });
    }
  }
}
```

### 🔍 보안 감사

- **의존성 스캔**: `npm audit` 자동 실행
- **시크릿 스캔**: 커밋 전 시크릿 검사
- **접근 로그**: 모든 API 요청 로깅
- **권한 검토**: 정기적인 사용자 권한 감사

## 🚦 API 문서

### 📖 Swagger UI

개발 서버 실행 후 브라우저에서 접속:

- **로컬 개발**: http://localhost:4000/docs
- **인터랙티브 API 테스트**: 직접 요청 실행 가능
- **스키마 다운로드**: JSON/YAML 형식 지원

### 🎯 주요 API 엔드포인트

#### 🔐 인증 (Authentication)

```http
POST /api/v1/auth/login          # 로그인
POST /api/v1/auth/register       # 회원가입
POST /api/v1/auth/refresh        # 토큰 갱신
POST /api/v1/auth/logout         # 로그아웃
```

#### 👤 사용자 (Users)

```http
GET  /api/v1/users/profile       # 내 프로필 조회
PUT  /api/v1/users/profile       # 프로필 수정
GET  /api/v1/users/:id           # 사용자 조회
```

#### 📂 프로젝트 (Projects)

```http
GET  /api/v1/projects            # 프로젝트 목록
POST /api/v1/projects            # 프로젝트 생성
GET  /api/v1/projects/:id        # 프로젝트 상세
PUT  /api/v1/projects/:id        # 프로젝트 수정
DELETE /api/v1/projects/:id      # 프로젝트 삭제
```

#### ⚡ 파이프라인 (Pipelines)

```http
GET  /api/v1/pipelines           # 파이프라인 목록
POST /api/v1/pipelines           # 파이프라인 생성
POST /api/v1/pipelines/:id/run   # 파이프라인 실행
GET  /api/v1/pipelines/:id/runs  # 실행 이력
GET  /api/v1/pipelines/runs/:runId/logs  # 실행 로그
```

#### 🔗 웹훅 (Webhooks)

```http
POST /api/v1/webhooks/github     # GitHub 웹훅 수신
GET  /api/v1/webhooks/status     # 웹훅 상태 확인
```

### 🛠️ Nestia SDK

프론트엔드에서 사용할 타입 안전 SDK 자동 생성:

```bash
# SDK 생성
pnpm nestia sdk

# 생성된 SDK 사용 예시 (Frontend)
import { api } from '@otto/sdk';

const projects = await api.functional.projects.index({
  headers: { Authorization: `Bearer ${token}` }
});
```

## 💡 개발 팁 & 베스트 프랙티스

### 🔥 개발 효율성

#### Hot Reload 최적화

```bash
# 개발 서버 시작 (변경사항 즉시 반영)
pnpm run start:dev

# 디버그 모드 (VSCode 브레이크포인트 지원)
pnpm run start:debug
```

#### Prisma Studio 활용

```bash
# 데이터베이스 GUI 실행
pnpm prisma studio

# 브라우저에서 http://localhost:5555 접속
# 실시간 데이터 조회/편집 가능
```

### 🗄️ 데이터베이스 팁

#### 마이그레이션 워크플로우

```bash
# 1. schema.prisma 수정
# 2. 개발 마이그레이션 생성
pnpm prisma migrate dev --name "add_user_avatar_field"

# 3. 프로덕션 적용 전 확인
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# 4. 프로덕션 배포
pnpm prisma migrate deploy
```

#### 쿼리 최적화

```typescript
// ✅ 좋은 예: include로 N+1 해결
const projectsWithPipelines = await prisma.project.findMany({
  include: {
    pipelines: {
      include: { runs: { take: 5, orderBy: { createdAt: 'desc' } } },
    },
  },
});

// ❌ 나쁜 예: N+1 쿼리 문제
const projects = await prisma.project.findMany();
for (const project of projects) {
  project.pipelines = await prisma.pipeline.findMany({
    where: { projectID: project.projectID },
  });
}
```

### 🐛 디버깅 전략

#### 로깅 레벨 설정

```typescript
// 개발 환경: 상세 로깅
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}
```

#### VSCode 디버깅 설정

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Otto Handler",
  "program": "${workspaceFolder}/dist/main.js",
  "preLaunchTask": "npm: build",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "envFile": "${workspaceFolder}/.env.dev"
}
```

### 🧪 테스트 작성 팁

#### 테스트 데이터 팩토리

```typescript
// test/factories/user.factory.ts
export const createTestUser = async (overrides: Partial<User> = {}) => {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: await bcrypt.hash('password123', 12),
      ...overrides,
    },
  });
};
```

#### 테스트 격리

```typescript
// 각 테스트 후 데이터 정리
afterEach(async () => {
  await prisma.$transaction([
    prisma.job.deleteMany(),
    prisma.pipelineRun.deleteMany(),
    prisma.pipeline.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});
```

### ⚡ 성능 최적화

#### Redis 캐싱 패턴

```typescript
@Injectable()
export class CacheService {
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    ttl: number = 3600,
  ): Promise<T> {
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const data = await getter();
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data;
  }
}
```

#### 데이터베이스 연결 풀 최적화

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["relationJoins"]
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url = env("POSTGRESQL_URL")
  // 연결 풀 설정
  // postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=20
}
```

### 🔧 개발 환경 문제 해결

#### 포트 충돌 해결

```bash
# 포트 사용 중인 프로세스 확인
lsof -ti:4000

# 프로세스 종료
kill -9 $(lsof -ti:4000)

# 또는 다른 포트 사용
OTTO_HANDLER_SERVER_PORT=4001 pnpm run start:dev
```

#### 의존성 문제 해결

```bash
# 깨끗한 설치
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Prisma 클라이언트 재생성
pnpm prisma generate

# 타입 검사
pnpm run build
```

## 🛠️ 문제 해결

### 🚨 일반적인 문제들

#### 1. 데이터베이스 연결 오류

**증상**: `Can't reach database server`

**해결책**:

```bash
# 1. 데이터베이스 서버 상태 확인
psql $POSTGRESQL_URL -c "SELECT 1;"

# 2. 연결 문자열 확인
echo $POSTGRESQL_URL

# 3. PostgreSQL 서비스 재시작 (로컬)
sudo systemctl restart postgresql

# 4. Docker 컨테이너 확인
docker ps | grep postgres
docker logs postgres-container-name
```

#### 2. Prisma 클라이언트 오류

**증상**: `PrismaClient is unable to be run in the browser`

**해결책**:

```bash
# Prisma 클라이언트 재생성
pnpm prisma generate

# 캐시 정리 후 재설치
rm -rf node_modules .next/cache
pnpm install
```

#### 3. 마이그레이션 충돌

**증상**: `Migration failed`

**해결책**:

```bash
# 마이그레이션 상태 확인
pnpm prisma migrate status

# 실패한 마이그레이션 해결
pnpm prisma migrate resolve --rolled-back 20231201_migration_name

# 강제 마이그레이션 (개발 환경만)
pnpm prisma migrate reset --force
pnpm prisma migrate dev
```

#### 4. Redis 연결 실패

**증상**: `Redis connection failed`

**해결책**:

```bash
# Redis 서버 상태 확인
redis-cli ping

# Docker Redis 컨테이너 확인
docker ps | grep redis
docker restart redis-container-name

# 연결 설정 확인
echo $REDIS_URL
```

### 🔧 고급 디버깅

#### 데이터베이스 성능 분석

```sql
-- 느린 쿼리 확인
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 인덱스 사용률 확인
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### 메모리 누수 추적

```bash
# Node.js 힙 덤프 생성
node --inspect=0.0.0.0:9229 dist/main.js

# 또는 프로덕션에서
kill -USR2 <pid>  # heap dump 생성
```

### 📞 지원 채널

#### 🐛 버그 리포트

```markdown
## 버그 리포트 템플릿

**환경 정보**

- OS: [macOS/Linux/Windows]
- Node.js: [버전]
- pnpm: [버전]
- 브라우저: [Chrome/Safari/Firefox]

**재현 단계**

1. ...
2. ...
3. ...

**예상 결과**
...

**실제 결과**
...

**로그/스크린샷**
```

#### 📚 문서 및 참고 자료

- **NestJS 공식 문서**: https://docs.nestjs.com/
- **Prisma 가이드**: https://www.prisma.io/docs/
- **Nestia 문서**: https://nestia.io/docs/
- **GitHub Repository**: [프로젝트 저장소 링크]

### 🚀 성능 모니터링

#### Health Check 엔드포인트

```http
GET /health

# 응답 예시
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

#### 시스템 리소스 모니터링

```bash
# CPU 및 메모리 사용률
top -p $(pgrep -f 'node.*otto-handler')

# 네트워크 연결 상태
netstat -tulpn | grep :4000

# 디스크 사용량
df -h
```

## 📚 참고 자료 & 커뮤니티

### 📖 공식 문서

| 기술 스택   | 문서 링크                                     | 주요 내용                      |
| ----------- | --------------------------------------------- | ------------------------------ |
| **NestJS**  | [docs.nestjs.com](https://docs.nestjs.com/)   | 프레임워크 가이드, 모듈 시스템 |
| **Prisma**  | [prisma.io/docs](https://www.prisma.io/docs/) | ORM, 마이그레이션, 쿼리 최적화 |
| **Nestia**  | [nestia.io](https://nestia.io/)               | 타입 안전 SDK, Swagger 자동화  |
| **Fastify** | [fastify.io](https://www.fastify.io/)         | 고성능 웹 프레임워크           |
| **typia**   | [typia.io](https://typia.io/)                 | 런타임 타입 검증               |
| **pnpm**    | [pnpm.io](https://pnpm.io/)                   | 패키지 매니저                  |

### 🎯 프로젝트 전용 가이드

- **[CLAUDE.md](./CLAUDE.md)** - AI 어시스턴트를 위한 상세 개발 가이드
- **[.cursorrules](./.cursorrules)** - Cursor IDE 개발 규칙 및 컨벤션
- **[Prisma Schema](./prisma/schema.prisma)** - 데이터베이스 스키마 정의
- **[Nestia Config](./nestia.config.ts)** - API SDK 자동 생성 설정

### 🛠️ 개발 도구 및 확장

#### VSCode 추천 확장

```json
{
  "recommendations": [
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json"
  ]
}
```

#### 유용한 CLI 도구

```bash
# Prisma 관련
npx prisma-docs generate  # 스키마 문서 생성
npx @databases/pg-schema-print-types  # 타입 정의 추출

# NestJS 관련
npx @nestjs/cli generate service users  # 서비스 생성
npx @nestjs/cli generate controller auth  # 컨트롤러 생성
```

### 🎓 학습 리소스

#### 블로그 & 튜토리얼

- **Prisma Blog**: 최신 ORM 기능 및 베스트 프랙티스
- **NestJS Blog**: 아키텍처 패턴 및 고급 기능
- **Fastify Documentation**: 성능 최적화 가이드

#### 커뮤니티

- **Discord**: NestJS, Prisma 공식 커뮤니티
- **Stack Overflow**: 기술적 질문 및 문제 해결
- **GitHub Discussions**: 오픈 소스 프로젝트 토론

### 🎯 다음 단계

#### 📈 로드맵

1. **Phase 1**: 핵심 CI/CD 기능 완성
2. **Phase 2**: 고급 파이프라인 기능 (병렬 실행, 조건부 실행)
3. **Phase 3**: 모니터링 및 알림 시스템
4. **Phase 4**: 멀티 클라우드 지원 (AWS, GCP, Azure)

#### 🤝 기여 방법

```bash
# 1. 저장소 포크
# 2. 기능 브랜치 생성
git checkout -b feat/new-amazing-feature

# 3. 변경사항 커밋
git commit -m "feat: add amazing new feature"

# 4. 풀 리퀘스트 생성
```

---

<div align="center">
  <h3>🚀 Otto Handler</h3>
  <p><strong>현대적이고 안전한 CI/CD 자동화의 새로운 표준</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge" alt="Made with Love" />
    <img src="https://img.shields.io/badge/TypeScript-First-blue?style=for-the-badge" alt="TypeScript First" />
    <img src="https://img.shields.io/badge/Open%20Source-🌟-green?style=for-the-badge" alt="Open Source" />
  </p>
</div>
