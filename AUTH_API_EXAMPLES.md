# 인증 API 사용 예제

## cURL 예제

### 1. 회원가입

```bash
curl -X POST http://localhost:4004/sign_up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "홍길동"
  }'
```

**성공 응답 (201)**:

```json
{
  "message": "회원가입 성공"
}
```

**에러 응답 (409)**:

```json
{
  "message": "이미 가입된 이메일입니다",
  "error": "Conflict",
  "statusCode": 409
}
```

### 2. 로그인

```bash
curl -X POST http://localhost:4004/sign_in \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**성공 응답 (200)**:

```json
{
  "message": "로그인 성공",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 1209600
}
```

### 3. 토큰 갱신

```bash
curl -X POST http://localhost:4004/sign_in/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 4. 로그아웃

```bash
curl -X POST http://localhost:4004/sign_out \
  -b cookies.txt \
  -c cookies.txt
```

---

## JavaScript/TypeScript 예제

### 1. API 클라이언트 설정

```typescript
// api-client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

class AuthApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:4004') {
    this.client = axios.create({
      baseURL,
      withCredentials: true, // 쿠키 자동 전송
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답 인터셉터로 토큰 갱신 처리
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            await this.refreshToken();
            // 원래 요청 재시도
            return this.client.request(error.config);
          } catch (refreshError) {
            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  // 회원가입
  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    const response = await this.client.post('/sign_up', data);
    return response.data;
  }

  // 로그인
  async signIn(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post('/sign_in', data);
    return response.data;
  }

  // 토큰 갱신
  async refreshToken(): Promise<LoginResponse> {
    const response = await this.client.post('/sign_in/refresh');
    return response.data;
  }

  // 로그아웃
  async signOut(): Promise<MessageResponse> {
    const response = await this.client.post('/sign_out');
    return response.data;
  }
}

export const authApi = new AuthApiClient();
```

### 2. 타입 정의

```typescript
// types/auth.ts
export interface SignUpRequest {
  email: string;
  password: string;
  username: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

export interface SignUpResponse {
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}
```

### 3. React Hook 예제

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authApi, LoginRequest, SignUpRequest } from '../api-client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 로그인
  const signIn = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.signIn(credentials);
      // 사용자 정보는 별도 API로 가져와야 함
      setUser({ email: credentials.email });
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 회원가입
  const signUp = async (userData: SignUpRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.signUp(userData);
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      await authApi.signOut();
      setUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || '로그아웃에 실패했습니다');
    }
  };

  // 토큰 갱신
  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken();
      return response;
    } catch (err: any) {
      setUser(null);
      throw err;
    }
  };

  // 초기 로딩 시 토큰 유효성 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 사용자 정보 조회 API 호출
        // const userData = await authApi.getUserProfile();
        // setUser(userData);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshToken,
  };
};
```

### 4. React 컴포넌트 예제

```typescript
// components/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { signIn, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(formData);
      // 로그인 성공 시 리다이렉트
      window.location.href = '/dashboard';
    } catch (err) {
      // 에러는 useAuth에서 처리됨
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">이메일</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <label htmlFor="password">비밀번호</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
};
```

---

## Next.js 예제

### 1. API Routes

```typescript
// pages/api/auth/signin.ts
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await axios.post(
      'http://localhost:4004/sign_in',
      req.body,
      {
        withCredentials: true,
      },
    );

    // 쿠키 설정
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      cookies.forEach((cookie) => {
        res.setHeader('Set-Cookie', cookie);
      });
    }

    res.status(200).json(response.data);
  } catch (error: any) {
    res
      .status(error.response?.status || 500)
      .json(error.response?.data || { message: 'Internal server error' });
  }
}
```

### 2. Middleware (토큰 검증)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token');

  // 보호된 경로 체크
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## Vue.js 예제

### 1. Vuex Store

```typescript
// store/auth.ts
import { Module } from 'vuex';
import { authApi } from '../api-client';

interface AuthState {
  user: any | null;
  loading: boolean;
  error: string | null;
}

export const authModule: Module<AuthState, any> = {
  namespaced: true,
  state: {
    user: null,
    loading: false,
    error: null,
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
  },
  actions: {
    async signIn({ commit }, credentials) {
      try {
        commit('SET_LOADING', true);
        commit('SET_ERROR', null);
        const response = await authApi.signIn(credentials);
        commit('SET_USER', { email: credentials.email });
        return response;
      } catch (error: any) {
        commit(
          'SET_ERROR',
          error.response?.data?.message || '로그인에 실패했습니다',
        );
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    async signOut({ commit }) {
      try {
        await authApi.signOut();
        commit('SET_USER', null);
      } catch (error: any) {
        commit(
          'SET_ERROR',
          error.response?.data?.message || '로그아웃에 실패했습니다',
        );
      }
    },
  },
};
```

---

## 테스트 예제

### 1. Jest 테스트

```typescript
// __tests__/auth.test.ts
import { authApi } from '../api-client';

describe('Auth API', () => {
  test('회원가입 성공', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: '테스트유저',
    };

    const response = await authApi.signUp(userData);
    expect(response.message).toBe('회원가입 성공');
  });

  test('로그인 성공', async () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await authApi.signIn(credentials);
    expect(response.message).toBe('로그인 성공');
    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });
});
```

### 2. Cypress E2E 테스트

```typescript
// cypress/integration/auth.spec.ts
describe('인증 플로우', () => {
  it('회원가입 후 로그인', () => {
    // 회원가입
    cy.visit('/signup');
    cy.get('[data-cy=email]').type('test@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=username]').type('테스트유저');
    cy.get('[data-cy=signup-button]').click();
    cy.contains('회원가입 성공');

    // 로그인
    cy.visit('/login');
    cy.get('[data-cy=email]').type('test@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=login-button]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

---

## 문제 해결

### 1. 쿠키가 전송되지 않는 경우

```typescript
// axios 설정에서 withCredentials 확인
const client = axios.create({
  baseURL: 'http://localhost:4004',
  withCredentials: true, // 이 설정이 중요
});
```

### 2. CORS 에러

```typescript
// 백엔드에서 CORS 설정 확인
app.enableCors({
  origin: 'http://localhost:3000', // 프론트엔드 URL
  credentials: true, // 쿠키 허용
});
```

### 3. 토큰 만료 처리

```typescript
// 자동 토큰 갱신 로직
const handleTokenExpiry = async (originalRequest: any) => {
  try {
    await authApi.refreshToken();
    return originalRequest;
  } catch (error) {
    // 로그인 페이지로 리다이렉트
    window.location.href = '/login';
    throw error;
  }
};
```
