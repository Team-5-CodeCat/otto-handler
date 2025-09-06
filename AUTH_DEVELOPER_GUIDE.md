# 인증 시스템 개발자 가이드

## 개요

Otto Handler의 인증 시스템은 JWT 기반의 토큰 인증을 사용하며, HttpOnly 쿠키를 통한 자동 토큰 관리를 지원합니다.

## 아키텍처

### 1. 인증 플로우

```
1. 사용자 로그인 요청
2. 이메일/비밀번호 검증
3. JWT Access Token + Refresh Token 생성
4. HttpOnly 쿠키로 토큰 전송
5. 이후 요청에서 쿠키 자동 전송
6. Access Token 만료 시 Refresh Token으로 갱신
```

### 2. 토큰 구조

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string; // 사용자 ID
  email: string; // 이메일
  username: string; // 닉네임
  iat: number; // 발급 시간
  exp: number; // 만료 시간
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string; // 사용자 ID
  tokenVersion: number; // 토큰 버전 (무효화용)
  iat: number; // 발급 시간
  exp: number; // 만료 시간
}
```

### 3. 보안 정책

- **Access Token**: 15분 만료 (짧은 수명으로 보안 강화)
- **Refresh Token**: 14일 만료 (자동 갱신)
- **쿠키 설정**: HttpOnly, Secure, SameSite=Lax
- **비밀번호**: bcrypt 해싱, 최소 8자

## 코드 구조

### 1. 디렉토리 구조

```
src/auth/
├── controllers/
│   └── auth.controller.ts      # API 엔드포인트
├── services/
│   └── auth.service.ts         # 비즈니스 로직
├── dtos/
│   ├── request/
│   │   ├── login-request.dto.ts
│   │   └── sign-up-request.dto.ts
│   └── response/
│       ├── login-response.dto.ts
│       └── sign-up-response.dto.ts
├── constants/
│   ├── auth-response.enum.ts
│   ├── auth-error.enum.ts
│   └── token.constants.ts
└── auth.module.ts
```

### 2. 주요 컴포넌트

#### AuthController

```typescript
@Controller()
export class AuthController {
  // POST /sign_up - 회원가입
  // POST /sign_in - 로그인
  // POST /sign_in/refresh - 토큰 갱신
  // POST /sign_out - 로그아웃
}
```

#### AuthService

```typescript
@Injectable()
export class AuthService {
  // 비밀번호 해싱
  // JWT 토큰 생성
  // 사용자 검증
  // 토큰 갱신
}
```

## 개발 가이드

### 1. 새로운 인증 기능 추가

#### 1.1 DTO 정의

```typescript
// src/auth/dtos/request/new-feature-request.dto.ts
export interface NewFeatureRequestDto {
  // 요청 데이터 타입 정의
}
```

#### 1.2 서비스 메서드 추가

```typescript
// src/auth/services/auth.service.ts
async newFeature(data: NewFeatureRequestDto) {
  // 비즈니스 로직 구현
}
```

#### 1.3 컨트롤러 엔드포인트 추가

```typescript
// src/auth/controllers/auth.controller.ts
@TypedRoute.Post('/new-feature')
async newFeature(@TypedBody() body: NewFeatureRequestDto) {
  return this.authService.newFeature(body);
}
```

### 2. 에러 처리

#### 2.1 에러 타입 정의

```typescript
// src/auth/constants/auth-error.enum.ts
export enum AuthErrorEnum {
  NEW_ERROR = '새로운 에러 메시지',
}
```

#### 2.2 서비스에서 에러 발생

```typescript
throw new BadRequestException(AuthErrorEnum.NEW_ERROR);
```

#### 2.3 컨트롤러에서 에러 처리

```typescript
@TypedException<CommonErrorResponseDto>({
  status: HttpStatus.BAD_REQUEST,
  description: '새로운 에러',
})
```

### 3. 유효성 검사

#### 3.1 DTO 유효성 검사

```typescript
export interface SignUpRequestDto {
  email: string & tags.Format<'email'>; // 이메일 형식 검증
  password: string & tags.MinLength<8>; // 최소 8자
  username: string;
}
```

#### 3.2 서비스 레벨 검증

```typescript
async signUp(data: SignUpRequestDto) {
  // 이메일 중복 검사
  const existingUser = await this.prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new ConflictException(AuthErrorEnum.EMAIL_ALREADY_EXISTS);
  }
}
```

## 테스트

### 1. 단위 테스트

```typescript
// src/auth/services/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, PrismaService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('signUp', () => {
    it('새로운 사용자 회원가입 성공', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        username: '테스트유저',
      };

      const result = await service.signUp(userData);
      expect(result.message).toBe('회원가입 성공');
    });
  });
});
```

### 2. 통합 테스트

```typescript
// src/auth/auth.controller.spec.ts
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/sign_up (POST)', () => {
    return request(app.getHttpServer())
      .post('/sign_up')
      .send({
        email: 'test@example.com',
        password: 'password123',
        username: '테스트유저',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBe('회원가입 성공');
      });
  });
});
```

## 보안 고려사항

### 1. 비밀번호 보안

```typescript
// bcrypt를 사용한 비밀번호 해싱
import * as bcrypt from 'bcrypt';

const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 2. JWT 토큰 보안

```typescript
// 강력한 시크릿 키 사용
const JWT_SECRET = process.env.JWT_SECRET; // 최소 32자
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET; // 최소 32자

// 토큰 서명
const token = jwt.sign(payload, secret, { expiresIn: '15m' });
```

### 3. 쿠키 보안

```typescript
// 안전한 쿠키 설정
res.setCookie('access_token', token, {
  httpOnly: true, // XSS 방지
  secure: true, // HTTPS에서만 전송
  sameSite: 'lax', // CSRF 방지
  path: '/', // 전체 도메인에서 접근 가능
  maxAge: 900, // 15분
});
```

## 성능 최적화

### 1. 데이터베이스 최적화

```typescript
// 인덱스 추가
model User {
  id       String @id @default(cuid())
  email    String @unique  // 이메일 인덱스
  username String
  // ...

  @@index([email])  // 이메일 검색 최적화
}
```

### 2. 캐싱 전략

```typescript
// Redis를 사용한 토큰 캐싱
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async validateToken(token: string) {
    // Redis에서 먼저 확인
    const cached = await this.redis.get(`token:${token}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // DB에서 확인 후 캐싱
    const user = await this.prisma.user.findUnique({...});
    await this.redis.setex(`token:${token}`, 900, JSON.stringify(user));
    return user;
  }
}
```

## 모니터링 및 로깅

### 1. 로그 설정

```typescript
// 인증 관련 로그
this.logger.log(`User ${email} logged in successfully`);
this.logger.warn(`Failed login attempt for ${email}`);
this.logger.error(`Token refresh failed for user ${userId}`);
```

### 2. 메트릭 수집

```typescript
// 인증 메트릭
-login_attempts_total -
  login_success_total -
  login_failure_total -
  token_refresh_total -
  active_sessions_total;
```

## 배포 고려사항

### 1. 환경 변수

```bash
# 프로덕션 환경
JWT_SECRET=your-super-secret-key-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-key-32-chars-min
NODE_ENV=production
COOKIE_SECURE=true
```

### 2. 데이터베이스 마이그레이션

```bash
# 사용자 테이블 생성
pnpm prisma migrate dev --name create-user-table

# 인덱스 추가
pnpm prisma migrate dev --name add-user-indexes
```

### 3. 헬스체크

```typescript
// 인증 서비스 헬스체크
@Get('/health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'auth',
  };
}
```

## 문제 해결

### 1. 일반적인 문제

#### 토큰이 전송되지 않는 경우

- `withCredentials: true` 설정 확인
- CORS 설정에서 `credentials: true` 확인
- 쿠키 도메인 설정 확인

#### 토큰 갱신 실패

- Refresh Token 만료 확인
- 토큰 서명 검증 확인
- 데이터베이스 연결 상태 확인

#### 비밀번호 해싱 문제

- bcrypt 버전 호환성 확인
- Salt rounds 설정 확인
- 비밀번호 길이 제한 확인

### 2. 디버깅 팁

#### 로그 레벨 설정

```typescript
// 개발 환경에서 디버그 로그 활성화
if (process.env.NODE_ENV === 'development') {
  this.logger.debug('Token payload:', payload);
}
```

#### 토큰 디코딩

```typescript
// JWT 토큰 내용 확인 (개발용)
const decoded = jwt.decode(token, { complete: true });
console.log('Token header:', decoded.header);
console.log('Token payload:', decoded.payload);
```

## 참고 자료

- [JWT 공식 문서](https://jwt.io/)
- [NestJS 인증 가이드](https://docs.nestjs.com/security/authentication)
- [bcrypt 문서](https://www.npmjs.com/package/bcrypt)
- [Prisma 보안 가이드](https://www.prisma.io/docs/guides/security)
