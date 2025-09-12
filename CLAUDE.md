# CLAUDE.md

이 파일은 Claude Code에게 이 저장소에서 작업할 때의 가이드라인을 제공합니다.

## 프로젝트 개요

Otto Handler는 팀과 개발자를 위한 간단하고 효율적인 빌드 파이프라인을 제공하는 NestJS 기반 CI/CD 자동화 플랫폼입니다.

### 핵심 기술 스택

- **프레임워크**: NestJS with Fastify adapter (고성능)
- **데이터베이스**: PostgreSQL with Prisma ORM
- **인증**: JWT with refresh tokens, bcrypt for password hashing
- **API 문서화**: Nestia (타입 안전 SDK 생성) + Swagger
- **타입 안전성**: TypeScript + typia (런타임 검증)
- **캐싱**: Redis
- **GitHub 통합**: Octokit, GitHub App, 웹훅

## 개발 환경 명령어

### 기본 개발 워크플로

```bash
# 의존성 설치
pnpm install

# Prisma 클라이언트 생성 (postinstall에서 자동 실행)
pnpm prisma generate

# 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 개발 서버 시작 (핫 리로드)
pnpm run start:dev
```

### 빌드 및 테스트

```bash
# 애플리케이션 빌드
pnpm run build

# 린팅 실행
pnpm run lint

# 코드 포맷팅
pnpm run format

# 테스트 실행
pnpm test
pnpm test:watch
pnpm test:cov
pnpm test:e2e

# 특정 테스트 실행
jest path/to/test.spec.ts
```

### 데이터베이스 작업

```bash
# Prisma 클라이언트 생성
pnpm prisma generate

# 데이터베이스 마이그레이션 적용
pnpm prisma migrate dev

# Prisma Studio에서 데이터베이스 확인
pnpm prisma studio

# 데이터베이스 리셋 (주의: 모든 데이터 삭제)
pnpm prisma migrate reset

# 프로덕션 마이그레이션 배포
pnpm prisma migrate deploy
```

### 패키지 관리

```bash
# 새 패키지 설치
pnpm add package-name

# 개발 의존성 설치
pnpm add -D package-name
```

### Nestia SDK 생성

```bash
# 타입 안전 SDK 생성
pnpm nestia sdk

# Swagger 문서 생성
pnpm nestia swagger
```

## 아키텍처 개요

### 핵심 아키텍처 패턴

- **모듈러 구조**: NestJS의 모듈 시스템으로 도메인 주도 설계
- **전역 모듈**: PrismaModule, ConfigModule, RedisModule은 전역으로 사용
- **순환 참조 해결**: forwardRef()를 사용하여 모듈 간 순환 참조 해결
- **타입 안전성**: Nestia + typia로 컴파일 시간과 런타임 모두에서 타입 검증

### 모듈 구조

```
src/
├── auth/           # 사용자 인증 (JWT, bcrypt, refresh tokens)
├── user/           # 사용자 관리
├── projects/       # 프로젝트 관리 및 GitHub 저장소 통합
├── pipelines/      # CI/CD 파이프라인 정의 및 실행
├── environments/   # 환경 설정 (언어, 배포 설정)
├── webhooks/       # GitHub 웹훅 처리
├── database/       # Prisma 데이터베이스 설정
├── common/         # 공통 유틸리티, 가드, 인터셉터, 파이프
└── modules/        # 기타 모듈들
```

### 데이터 모델 계층구조

```
User → Project → Pipeline → PipelineRun → Job → Log/Error/StatusEvent
```

핵심 엔티티:

- **User**: 인증 및 프로젝트 소유권
- **Project**: GitHub 저장소 연결 및 웹훅 URL
- **Pipeline**: 빌드/테스트/배포 워크플로 정의 (YAML 및 블록 기반 PaB 방식 지원)
- **Job**: 개별 작업 (BUILD/TEST/DEPLOYMENT) 재시도 로직 포함
- **Environment**: 언어 및 배포 환경 설정

### 파이프라인 실행 흐름

1. **프로젝트 생성**: GitHub 저장소를 프로젝트에 연결
2. **파이프라인 설정**: 빌드/테스트/배포 단계 정의 (YAML 또는 블록 기반)
3. **실행**: 웹훅 또는 수동 실행으로 트리거
4. **Job 처리**: Build → Test → Deploy 순서로 포괄적인 로깅
5. **아티팩트 저장**: S3 통합으로 빌드 아티팩트 및 로그 저장

## 개발 지침

### 환경 설정

- **포트**: 4000 (OTTO_HANDLER_SERVER_PORT 환경변수로 설정 가능)
- **데이터베이스**: PostgreSQL (POSTGRESQL_URL 환경변수 필요)
- **패키지 매니저**: pnpm (Node.js 22+, pnpm 9+ 필요)
- **API 프리픽스**: `/api/v1` (health, docs 제외)
- **Swagger 문서**: 개발 모드에서 `/docs`에서 접근 가능

### 핵심 기능

#### 1. 타입 안전성 및 검증

- **Nestia**: 프론트엔드용 타입 안전 SDK 자동 생성
- **typia**: 런타임 타입 검증 및 변환
- **Prisma**: 스키마 우선 접근법으로 데이터베이스 타입 안전성

#### 2. GitHub 통합

- **GitHub App**: OAuth 앱이 아닌 GitHub App 사용
- **웹훅**: 푸시 이벤트 자동 처리
- **Octokit**: GitHub API 클라이언트

#### 3. 파이프라인 관리

- **YAML 설정**: 전통적인 CI/CD 설정 방식
- **블록 기반 PaB**: 시각적 파이프라인 구성
- **Job 타입**: BUILD, TEST, DEPLOYMENT
- **재시도 로직**: 실패한 Job에 대한 자동 재시도

### 코딩 컨벤션

#### 모듈 구조

```typescript
// 모듈 예시
@Module({
  imports: [PrismaModule], // 필요한 모듈 임포트
  controllers: [SomeController],
  providers: [SomeService],
  exports: [SomeService], // 다른 모듈에서 사용할 서비스
})
export class SomeModule {}
```

#### 컨트롤러 패턴

```typescript
@Controller('endpoint')
export class SomeController {
  constructor(private readonly service: SomeService) {}

  @TypedRoute.Post('create')
  async create(@TypedBody() dto: CreateDto): Promise<ResponseDto> {
    // Nestia의 TypedRoute, TypedBody 사용
  }
}
```

#### 서비스 패턴

```typescript
@Injectable()
export class SomeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Entity[]> {
    return this.prisma.entity.findMany({
      include: { relations: true }, // 관계형 데이터 포함
    });
  }
}
```

### 데이터베이스 스키마 중요사항

#### 열거형 (Enums)

```prisma
enum JobStatus {
  pending
  running
  completed
  failed
  cancelled
}

enum JobType {
  BUILD
  TEST
  DEPLOYMENT
}

enum Language {
  NODE
  PYTHON
}
```

#### 인덱스 최적화

- 모든 주요 검색 필드에 인덱스 설정
- 타임스탬프 필드 (createdAt, updatedAt)에 인덱스
- 외래 키 관계에 인덱스

### 보안 고려사항

1. **JWT 토큰**: Access token + Refresh token 패턴
2. **비밀번호**: bcrypt로 해싱
3. **GitHub 토큰**: 만료 시간 관리 및 자동 갱신
4. **환경변수**: 민감한 정보는 .env 파일로 관리

### 성능 최적화

1. **Fastify**: Express 대신 Fastify 사용으로 높은 성능
2. **Redis**: 세션 및 캐싱
3. **Prisma**: relationJoins 프리뷰 기능으로 쿼리 최적화
4. **인덱싱**: 자주 조회되는 필드에 데이터베이스 인덱스

### 에러 처리

- **AllExceptionsFilter**: 전역 예외 필터로 일관된 에러 응답
- **Job 에러 추적**: JobError 모델로 상세한 에러 로깅
- **재시도 로직**: Job 레벨에서 자동 재시도 (최대 3회)

### 배포 환경

- **직접 실행**: EC2 인스턴스에서 Node.js 직접 실행
- **환경별 설정**: .env.dev, .env.prod, .env.test
- **데이터베이스**: 외부 PostgreSQL 인스턴스
- **로그**: S3를 통한 아티팩트 및 로그 저장

## 대규모 리팩토링 원칙 (2025.09.11 추가)

### Prisma 스키마 변경 시 체계적 접근법

1. **스키마 우선 원칙 (Schema-First)**
   - Prisma 스키마를 진실의 원천(Source of Truth)으로 삼음
   - 모든 코드를 스키마에 맞춰 수정, 반대는 하지 않음

2. **모델 통합 원칙**
   - 삭제된 모델은 유사한 기존 모델로 대체
   - 예: ProjectRepository → Project 모델에 GitHub 필드 통합

3. **필드명 일관성 원칙**
   - camelCase로 통일 (projectID → projectId, userID → userId)
   - snake_case, PascalCase 모두 제거

4. **타입 안전성 원칙**
   - 없는 enum은 type으로 대체 (MemberRole → UserRole type)
   - 없는 모델은 유사 모델로 대체 (RefreshToken → Session)

### 린트 에러 해결 순서

1. 필드명 불일치 → 일괄 치환으로 즉시 해결
2. 모델 참조 오류 → 대체 모델로 로직 변경
3. 타입 추론 실패 → `pnpm prisma generate` 실행
4. 남은 타입 에러 → 명시적 타입 선언 추가

## GitHub OAuth 전환 완료 (2025.09.11 업데이트)

### 인증 시스템 변경사항

1. **Password 인증 제거**
   - User 모델에서 `password` 필드 완전 제거
   - 모든 password 기반 로그인 비활성화
   - `POST /api/v1/auth/sign_in`은 GitHub OAuth 전용 메시지 반환

2. **GitHub OAuth 필수**
   - 모든 사용자는 GitHub 계정으로만 인증
   - `githubId`, `githubUsername` 필드 필수
   - GitHub App 설치를 통한 레포지토리 접근

3. **필드명 통일**
   - `userID` → `userId` (모든 ID 필드 camelCase로)
   - `lastUsedAt` → `updatedAt` (표준 Prisma 필드 사용)
   - `selectedBranch` → `defaultBranch`

4. **Enum 값 수정**
   - TriggerType: `PUSH` 제거, `WEBHOOK` 사용
   - 실제 스키마: `MANUAL`, `WEBHOOK`, `SCHEDULE`, `API`

### 주요 수정 파일 및 변경사항

| 파일 | 주요 변경사항 |
|-----|-------------|
| `auth.service.ts` | password 인증 로직 제거, OAuth 전용 메시지 |
| `auth-guard-role.service.ts` | userID → id 필드명 변경 |
| `project.service.ts` | TriggerType enum 값 수정, 필수 필드 추가 |
| `webhook.controller.ts` | 파라미터명 통일 (account, targetId) |
| `pipeline-execution.dto.ts` | pipelineId 필드 추가 |

## API 엔드포인트 현황 (2025.09.11 테스트 완료)

### 공개 엔드포인트 (인증 불필요)
- `POST /api/v1/auth/sign_out` - 로그아웃
- `GET /api/v1/webhooks/github` - 웹훅 상태 확인
- `GET /api/v1/projects/github/callback` - OAuth 콜백 (302 리다이렉트)

### 보호된 엔드포인트 (JWT 토큰 필요)
- 모든 `/api/v1/user/*` 엔드포인트
- 모든 `/api/v1/projects/*` 엔드포인트 (callback 제외)
- 모든 `/api/v1/pipelines/*` 엔드포인트

### 테스트 명령어
```bash
# 모든 엔드포인트 통신 테스트
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/[endpoint]

# 개발 서버 실행
pnpm start:dev

# Prisma 관련
pnpm prisma generate  # 클라이언트 재생성
pnpm prisma migrate dev  # 마이그레이션 적용
```

## 문제 해결

### 일반적인 문제

1. **Prisma 클라이언트 오류**

   ```bash
   pnpm prisma generate
   ```

2. **데이터베이스 연결 오류**
   - POSTGRESQL_URL 환경변수 확인
   - PostgreSQL 서버 상태 확인

3. **Redis 연결 오류**
   - REDIS_URL 환경변수 확인
   - Redis 서버 상태 확인

### 개발 팁

1. **Hot Reload**: `pnpm run start:dev`로 개발 중 자동 재시작
2. **데이터베이스 스키마 변경**: Prisma migrate로 안전한 스키마 변경
3. **API 테스트**: `/docs`에서 Swagger UI 사용
4. **타입 검증**: typia로 런타임에서도 타입 안전성 보장

## 중요한 지침

### 파일 생성 정책

- **기존 파일 우선**: 새 파일 생성보다 기존 파일 편집을 우선
- **문서 파일 제한**: 명시적 요청 없이는 .md 파일이나 README 생성 금지
- **필요시에만**: 목표 달성에 절대 필요한 경우에만 파일 생성

### 코드 품질

- **타입 안전성**: TypeScript strict 모드 준수
- **Nestia 패턴**: TypedRoute, TypedBody 등 Nestia 데코레이터 사용
- **에러 처리**: 모든 비동기 작업에 적절한 에러 처리
- **검증**: typia를 사용한 런타임 타입 검증

### 성능 고려사항

- **데이터베이스 쿼리**: include 사용 시 N+1 문제 주의
- **인덱스 활용**: WHERE 절에 사용되는 컬럼에 인덱스 확인
- **캐싱**: Redis를 활용한 적절한 캐싱 전략

## 새로운 API 개발 가이드라인 (2025.09.12 업데이트)

### API 개발 단계별 프로세스

#### 1. 계획 및 설계 단계

**1.1 도메인 분석**
- 새로운 API가 속할 도메인 모듈 식별 (auth, user, projects, webhooks 등)
- 기존 모듈에 추가할지, 새 모듈을 생성할지 결정
- RESTful 설계 원칙에 따른 엔드포인트 구조 계획

**1.2 Prisma 스키마 우선 설계**
```bash
# 스키마 변경이 필요한 경우
1. prisma/schema.prisma 수정
2. pnpm prisma migrate dev --name feature_name
3. pnpm prisma generate
```

#### 2. 파일 구조 및 네이밍 컨벤션

**2.1 표준 디렉터리 구조**
```
src/
├── {domain}/
│   ├── controllers/
│   │   └── {domain}.controller.ts
│   ├── services/
│   │   └── {domain}.service.ts
│   ├── dtos/
│   │   ├── request/
│   │   │   └── {action}-request.dto.ts
│   │   └── response/
│   │       └── {action}-response.dto.ts
│   ├── constants/
│   │   └── {domain}.constants.ts
│   └── {domain}.module.ts
```

**2.2 파일 네이밍 규칙**
- **Controller**: `{domain}.controller.ts` (예: `pipeline.controller.ts`)
- **Service**: `{domain}.service.ts` (예: `pipeline.service.ts`)
- **Module**: `{domain}.module.ts` (예: `pipeline.module.ts`)
- **DTO**: `{action}-{type}.dto.ts` (예: `create-pipeline-request.dto.ts`)

**2.3 메서드 네이밍 컨벤션**
```typescript
// Controller 메서드명: {domain}{Action}{Resource}
pipelineCreatePipeline()       // POST /pipelines
pipelineGetPipelineDetail()    // GET /pipelines/:id
pipelineUpdatePipeline()       // PATCH/PUT /pipelines/:id
pipelineDeletePipeline()       // DELETE /pipelines/:id
pipelineGetUserPipelines()     // GET /pipelines
```

#### 3. Controller 개발 패턴

**3.1 기본 Controller 템플릿**
```typescript
import { Controller, HttpStatus, Req } from '@nestjs/common';
import { TypedBody, TypedException, TypedParam, TypedRoute } from '@nestia/core';
import { AuthGuard } from '../../common/decorators';
import type { IRequestType } from '../../common/type';
import type { CommonErrorResponseDto } from '../../common/dto';

@Controller('pipelines') // 복수형 사용
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * @tag pipeline
   * @summary 파이프라인 생성
   */
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.UNAUTHORIZED,
    description: '로그인 필요',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.FORBIDDEN, 
    description: '권한 없음',
  })
  @TypedException<CommonErrorResponseDto>({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청',
  })
  @AuthGuard() // 보호된 엔드포인트의 경우
  @TypedRoute.Post()
  async pipelineCreatePipeline(
    @TypedBody() createDto: CreatePipelineRequestDto,
    @Req() req: IRequestType,
  ): Promise<CreatePipelineResponseDto> {
    const userId = req.user.user_id;
    return this.pipelineService.createPipeline(userId, createDto);
  }
}
```

**3.2 HTTP 메서드 및 엔드포인트 매핑**
```typescript
// 기본 CRUD 패턴
@TypedRoute.Post()           // POST /pipelines - 생성
@TypedRoute.Get()            // GET /pipelines - 목록 조회  
@TypedRoute.Get(':id')       // GET /pipelines/:id - 상세 조회
@TypedRoute.Patch(':id')     // PATCH /pipelines/:id - 부분 수정
@TypedRoute.Put(':id')       // PUT /pipelines/:id - 전체 수정
@TypedRoute.Delete(':id')    // DELETE /pipelines/:id - 삭제

// 중첩 리소스 패턴
@TypedRoute.Get(':pipelineId/runs')              // GET /pipelines/:pipelineId/runs
@TypedRoute.Post(':pipelineId/runs')             // POST /pipelines/:pipelineId/runs
@TypedRoute.Get(':pipelineId/runs/:runId')       // GET /pipelines/:pipelineId/runs/:runId
```

#### 4. Service 개발 패턴

**4.1 기본 Service 템플릿**
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async createPipeline(userId: string, data: CreatePipelineRequestDto) {
    // 권한 검증
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });
    
    if (!user) {
      throw new ForbiddenException('사용자를 찾을 수 없습니다');
    }

    // 비즈니스 로직 실행
    return this.prisma.pipeline.create({
      data: {
        ...data,
        userId,
      },
      include: {
        user: {
          select: { userId: true, email: true, name: true }
        }
      }
    });
  }
}
```

**4.2 에러 처리 패턴**
```typescript
// 표준 예외 사용
throw new NotFoundException('리소스를 찾을 수 없습니다');
throw new ForbiddenException('권한이 없습니다');
throw new BadRequestException('잘못된 요청입니다');
throw new ConflictException('이미 존재하는 리소스입니다');
throw new UnauthorizedException('로그인이 필요합니다');
```

#### 5. DTO 개발 패턴

**5.1 Request DTO 템플릿**
```typescript
import { tags } from 'typia';

export interface CreatePipelineRequestDto {
  /** 파이프라인 이름 */
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  
  /** 파이프라인 설명 (선택) */
  description?: string & tags.MaxLength<500>;
  
  /** 프로젝트 ID */
  projectId: string & tags.Format<'uuid'>;
  
  /** 트리거 타입 */
  triggerType: 'MANUAL' | 'WEBHOOK' | 'SCHEDULE' | 'API';
  
  /** 활성화 여부 */
  isActive?: boolean;
}
```

**5.2 Response DTO 템플릿**
```typescript
export interface CreatePipelineResponseDto {
  pipelineId: string;
  name: string;
  description: string | null;
  projectId: string;
  triggerType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    userId: string;
    email: string;
    name: string | null;
  };
}
```

**5.3 typia 태그 활용**
```typescript
// 자주 사용되는 validation 태그들
string & tags.MinLength<1>                    // 비어있지 않은 문자열
string & tags.Format<'uuid'>                  // UUID 형식
string & tags.Format<'email'>                 // 이메일 형식
string & tags.Format<'url'>                   // URL 형식
number & tags.Type<'int32'> & tags.Minimum<1> // 양의 정수
boolean                                       // 불린 타입
```

#### 6. Module 개발 패턴

**6.1 기본 Module 템플릿**
```typescript
import { Module } from '@nestjs/common';
import { PipelineService } from './services/pipeline.service';
import { PipelineController } from './controllers/pipeline.controller';

@Module({
  imports: [], // 필요한 다른 모듈들
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService], // 다른 모듈에서 사용할 서비스들
})
export class PipelineModule {}
```

**6.2 App Module 등록**
```typescript
// src/app.module.ts에 추가
@Module({
  imports: [
    // ... 기존 모듈들
    PipelineModule, // 새 모듈 추가
  ],
})
export class AppModule {}
```

#### 7. 인증 및 권한 처리

**7.1 JWT 기반 인증**
```typescript
// 보호된 엔드포인트
@AuthGuard()
@TypedRoute.Get()
async protectedEndpoint(@Req() req: IRequestType) {
  const userId = req.user.user_id; // JWT에서 사용자 ID 추출
  // ...
}

// 공개 엔드포인트 (인증 불필요)
@TypedRoute.Get('public')
async publicEndpoint() {
  // 인증 없이 접근 가능
}
```

**7.2 사용자 권한 검증**
```typescript
// Service 레이어에서 권한 검증
async getUserResource(userId: string, resourceId: string) {
  const resource = await this.prisma.resource.findFirst({
    where: { 
      id: resourceId,
      userId: userId  // 소유자 검증
    }
  });
  
  if (!resource) {
    throw new ForbiddenException('해당 리소스에 접근할 권한이 없습니다');
  }
  
  return resource;
}
```

#### 8. 데이터베이스 쿼리 최적화

**8.1 N+1 문제 방지**
```typescript
// 좋은 예: include 사용으로 한 번에 조회
const pipelines = await this.prisma.pipeline.findMany({
  include: {
    user: { select: { userId: true, email: true, name: true } },
    project: { select: { projectId: true, name: true } }
  }
});

// 나쁜 예: 반복문에서 개별 쿼리 실행
const pipelines = await this.prisma.pipeline.findMany();
for (const pipeline of pipelines) {
  const user = await this.prisma.user.findUnique({ where: { userId: pipeline.userId }});
}
```

**8.2 인덱스 활용 쿼리**
```typescript
// WHERE 절에 인덱스가 있는 필드 사용
const pipelines = await this.prisma.pipeline.findMany({
  where: {
    userId, // 인덱스 필드
    isActive: true, // 인덱스 필드
  },
  orderBy: { createdAt: 'desc' } // 인덱스 필드
});
```

#### 9. 테스트 및 검증

**9.1 개발 후 체크리스트**
```bash
# 1. Prisma 클라이언트 생성
pnpm prisma generate

# 2. 타입 체크
pnpm run build

# 3. 린팅 검사
pnpm run lint

# 4. 서버 실행 및 테스트
pnpm run start:dev

# 5. Swagger 문서 확인
# http://localhost:4000/docs

# 6. Nestia SDK 생성
pnpm nestia sdk
```

**9.2 API 테스트 방법**
```bash
# 엔드포인트 응답 코드 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/pipelines

# JWT 토큰 포함 요청
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:4000/api/v1/pipelines
```

#### 10. 문서화 및 주석

**10.1 JSDoc 스타일 주석**
```typescript
/**
 * @tag pipeline
 * @summary 파이프라인 생성
 * @description 새로운 CI/CD 파이프라인을 생성합니다.
 */
@TypedRoute.Post()
async pipelineCreatePipeline() {
  // ...
}
```

**10.2 DTO 필드 문서화**
```typescript
export interface CreatePipelineRequestDto {
  /** 파이프라인 이름 (필수, 1-100자) */
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  
  /** 파이프라인 상세 설명 (선택, 최대 500자) */
  description?: string & tags.MaxLength<500>;
}
```

### 주요 코딩 스타일 규칙

1. **필드명 일관성**: 모든 ID 필드는 camelCase (userId, projectId, pipelineId)
2. **컨트롤러 메서드**: `{domain}{Action}{Resource}` 패턴 
3. **에러 메시지**: 한국어로 사용자 친화적인 메시지
4. **타입 안전성**: Nestia + typia 조합으로 컴파일/런타임 검증
5. **비동기 처리**: 모든 데이터베이스 작업은 async/await 사용

### 성능 및 보안 고려사항

1. **쿼리 최적화**: include를 사용한 관계형 데이터 로딩
2. **인덱스 활용**: WHERE, ORDER BY 절에 인덱스 필드 사용  
3. **권한 검증**: 모든 보호된 리소스에 대한 소유자 확인
4. **입력 검증**: typia 태그를 활용한 런타임 validation
5. **에러 처리**: 적절한 HTTP 상태 코드와 함께 명확한 에러 메시지

이 가이드라인을 따라 Otto Handler 프로젝트의 일관성과 품질을 유지해주세요.
