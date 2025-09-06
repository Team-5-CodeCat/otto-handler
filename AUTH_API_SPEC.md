# 인증 API 명세서

## 개요

Otto Handler의 사용자 인증을 위한 API 명세서입니다. JWT 기반의 토큰 인증과 쿠키를 통한 자동 토큰 관리를 지원합니다.

## 기본 정보

- **Base URL**: `http://localhost:4004`
- **Content-Type**: `application/json`
- **인증 방식**: JWT (Access Token + Refresh Token)
- **토큰 저장**: HttpOnly 쿠키 (자동 관리)

---

## 1. 회원가입

### `POST /sign_up`

새로운 사용자 계정을 생성합니다.

#### Request Body

```typescript
interface SignUpRequestDto {
  email: string; // 이메일 (유효한 이메일 형식)
  password: string; // 비밀번호 (최소 8자 이상)
  username: string; // 닉네임
}
```

#### Request Example

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "홍길동"
}
```

#### Response (201 Created)

```typescript
interface SignUpResponseDto {
  message: '회원가입 성공';
}
```

#### Response Example

```json
{
  "message": "회원가입 성공"
}
```

#### Error Responses

- **409 Conflict**: 이메일 중복
  ```json
  {
    "message": "이미 가입된 이메일입니다",
    "error": "Conflict",
    "statusCode": 409
  }
  ```

---

## 2. 로그인

### `POST /sign_in`

이메일과 비밀번호로 로그인합니다. 성공 시 Access Token과 Refresh Token이 HttpOnly 쿠키로 자동 설정됩니다.

#### Request Body

```typescript
interface LoginRequestDto {
  email: string; // 이메일 (유효한 이메일 형식)
  password: string; // 비밀번호
}
```

#### Request Example

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response (200 OK)

```typescript
interface LoginResponseDto {
  message: '로그인 성공';
  accessToken: string; // JWT Access Token
  refreshToken: string; // JWT Refresh Token
  accessTokenExpiresIn: number; // Access Token 만료 시간 (초)
  refreshTokenExpiresIn: number; // Refresh Token 만료 시간 (초)
}
```

#### Response Example

```json
{
  "message": "로그인 성공",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExpiresIn": 900, // 15분
  "refreshTokenExpiresIn": 1209600 // 14일
}
```

#### Set-Cookie Headers

```
Set-Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=1209600
```

#### Error Responses

- **401 Unauthorized**: 로그인 실패
  ```json
  {
    "message": "아이디나 비밀번호가 틀립니다",
    "error": "Unauthorized",
    "statusCode": 401
  }
  ```

---

## 3. 토큰 갱신

### `POST /sign_in/refresh`

Refresh Token을 사용하여 새로운 Access Token을 발급받습니다. 쿠키에서 자동으로 Refresh Token을 읽어옵니다.

#### Request

- **Body**: 없음
- **Cookie**: `refresh_token` (자동으로 전송됨)

#### Response (200 OK)

```typescript
interface LoginResponseDto {
  message: '로그인 성공';
  accessToken: string; // 새로운 JWT Access Token
  refreshToken: string; // 새로운 JWT Refresh Token
  accessTokenExpiresIn: number; // Access Token 만료 시간 (초)
  refreshTokenExpiresIn: number; // Refresh Token 만료 시간 (초)
}
```

#### Response Example

```json
{
  "message": "로그인 성공",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExpiresIn": 900, // 15분
  "refreshTokenExpiresIn": 1209600 // 14일
}
```

#### Error Responses

- **401 Unauthorized**: Refresh Token 만료 또는 유효하지 않음
  ```json
  {
    "message": "세션이 만료되었어요. 다시 로그인 해주세요",
    "error": "Unauthorized",
    "statusCode": 401
  }
  ```

---

## 4. 로그아웃

### `POST /sign_out`

사용자를 로그아웃하고 모든 쿠키를 삭제합니다.

#### Request

- **Body**: 없음

#### Response (200 OK)

```typescript
interface CommonMessageResponseDto {
  message: '성공';
}
```

#### Response Example

```json
{
  "message": "성공"
}
```

#### Set-Cookie Headers

```
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
```

---

## 토큰 관리 정책

### Access Token

- **만료 시간**: 15분
- **용도**: API 인증
- **저장**: HttpOnly 쿠키
- **갱신**: Refresh Token 사용

### Refresh Token

- **만료 시간**: 14일
- **용도**: Access Token 갱신
- **저장**: HttpOnly 쿠키
- **갱신**: 로그인 시 자동 갱신

### 쿠키 설정

- **HttpOnly**: `true` (JavaScript에서 접근 불가)
- **Secure**: 프로덕션에서만 `true`
- **SameSite**: `Lax`
- **Path**: `/`

---

## 프론트엔드 구현 가이드

### 1. 기본 설정

```typescript
// API 클라이언트 설정
const API_BASE_URL = 'http://localhost:4004';

// 쿠키가 자동으로 전송되도록 설정
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 중요: 쿠키 자동 전송
});
```

### 2. 로그인 플로우

```typescript
// 1. 로그인
const login = async (email: string, password: string) => {
  const response = await apiClient.post('/sign_in', {
    email,
    password,
  });

  // 토큰은 쿠키에 자동 저장됨
  return response.data;
};

// 2. 토큰 갱신 (필요시)
const refreshToken = async () => {
  const response = await apiClient.post('/sign_in/refresh');
  return response.data;
};
```

### 3. API 요청 시 인증

```typescript
// 인증이 필요한 API 요청
const fetchUserData = async () => {
  try {
    const response = await apiClient.get('/user/profile');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // 토큰 갱신 시도
      try {
        await refreshToken();
        // 재시도
        const response = await apiClient.get('/user/profile');
        return response.data;
      } catch (refreshError) {
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
    }
    throw error;
  }
};
```

### 4. 로그아웃

```typescript
const logout = async () => {
  await apiClient.post('/sign_out');
  // 쿠키가 자동으로 삭제됨
  window.location.href = '/login';
};
```

---

## 에러 처리

### 공통 에러 응답 형식

```typescript
interface CommonErrorResponseDto {
  message: string; // 사용자에게 보여줄 메시지
  error: string; // 에러 타입
  statusCode: number; // HTTP 상태 코드
}
```

### 주요 에러 코드

- **400**: 잘못된 요청 (유효성 검사 실패)
- **401**: 인증 실패 (로그인 필요)
- **409**: 충돌 (이메일 중복)
- **500**: 서버 내부 오류

---

## 보안 고려사항

1. **HTTPS 사용**: 프로덕션에서는 반드시 HTTPS 사용
2. **쿠키 보안**: HttpOnly, Secure, SameSite 설정으로 XSS/CSRF 방지
3. **토큰 만료**: 짧은 Access Token 만료 시간으로 보안 강화
4. **비밀번호**: 최소 8자 이상, 복잡한 비밀번호 정책 권장

---

## 개발 환경 설정

### 환경 변수

```bash
# .env 파일
DATABASE_URL="postgresql://username:password@localhost:5432/otto_handler"
JWT_SECRET="your_jwt_secret_key"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_key"
PORT=4004
NODE_ENV=development
```

### 테스트 계정

개발 환경에서는 다음 계정으로 테스트할 수 있습니다:

- **이메일**: `test@example.com`
- **비밀번호**: `password123`
- **닉네임**: `테스트유저`

---

## 문의사항

API 사용 중 문제가 발생하거나 추가 기능이 필요한 경우, 백엔드 팀에 문의해주세요.

**담당자**: 백엔드 개발팀  
**이메일**: backend@otto-handler.com  
**슬랙**: #backend-support
