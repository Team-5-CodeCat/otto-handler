
# Otto Handler 프로젝트 구조

Otto Handler는 소규모 팀이나 초보 개발자를 위한 직관적이고 간단한 CI/CD 도구입니다.  
설정 복잡성을 줄이고 효율적인 자동화 경험을 제공하며, NestJS 모듈 기반 설계를 따릅니다.  
데이터베이스 관리는 Prisma를 사용합니다.

---

## 폴더 구조

```

/otto-handler/
├── dist/
├── node\_modules/
├── src/
│   ├── auth/                    # 사용자 인증 모듈
│   │   ├── controllers/         # 회원가입, 로그인, 로그아웃 HTTP 요청 처리
│   │   ├── services/            # 인증 관련 비즈니스 로직 (JWT, bcrypt 등)
│   │   ├── dtos/                # 요청/응답 데이터 전송 객체
│   │   ├── interfaces/          # 타입 안전성을 위한 인터페이스
│   │   ├── auth.module.ts       # 인증 모듈 정의
│   │   └── auth.constants.ts    # 인증 관련 상수
│   ├── projects/                # 프로젝트 관리 모듈
│   │   ├── controllers/         # 프로젝트 생성, GitHub 웹훅 설정 처리
│   │   ├── services/            # 프로젝트 생성 및 웹훅 연동 로직
│   │   ├── dtos/                # 프로젝트 관련 데이터 전송 객체
│   │   └── projects.module.ts   # 프로젝트 모듈 정의
│   ├── pipelines/               # CI/CD 파이프라인 모듈
│   │   ├── controllers/         # 파이프라인 생성 및 실행 처리
│   │   ├── services/            # 파이프라인 실행, 로그, 결과 처리
│   │   ├── dtos/                # 파이프라인 설정 데이터 전송 객체
│   │   ├── blocks/              # 블록 코딩(PaB) 방식 파이프라인 로직
│   │   ├── build/               # 빌드 프로세스 로직
│   │   ├── test/                # 테스트(Unit/E2E) 프로세스 로직
│   │   ├── deploy/              # 배포 프로세스 로직
│   │   └── pipelines.module.ts  # 파이프라인 모듈 정의
│   ├── environments/            # 환경 설정 모듈
│   │   ├── controllers/         # 언어/배포 환경 설정 처리
│   │   ├── services/            # 환경 설정 로직
│   │   ├── dtos/                # 환경 설정 데이터 전송 객체
│   │   └── environments.module.ts # 환경 설정 모듈 정의
│   ├── common/                  # 공통 유틸리티 및 설정
│   │   ├── config/              # 환경변수 및 설정 파일 로드
│   │   ├── decorators/          # 커스텀 데코레이터
│   │   ├── filters/             # 예외 처리 필터
│   │   ├── guards/              # 인증/인가 가드
│   │   ├── interceptors/        # 요청/응답 인터셉터
│   │   ├── pipes/               # 데이터 검증/변환 파이프
│   │   └── utils/               # 유틸리티 함수 (재시도, 로깅 등)
│   ├── integrations/            # 외부 서비스 연동 모듈
│   │   ├── github/              # GitHub 웹훅 연동
│   │   ├── aws/                 # AWS S3 연동
│   │   └── integrations.module.ts # 외부 연동 모듈 정의
│   ├── prisma/                  # Prisma 관련 파일
│   ├── app.controller.ts        # 루트 애플리케이션 컨트롤러
│   ├── app.module.ts            # 루트 NestJS 모듈
│   ├── app.service.ts           # 루트 애플리케이션 서비스
│   └── main.ts                  # 애플리케이션 진입점
├── test/                        # 테스트 파일
├── .env
├── .env.example
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── nest-cli.json
├── nestia.config.ts
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
└── tsconfig.build.json

```

---

## 설계 의도

- 모듈화: auth, projects, pipelines, environments 모듈로 도메인별 책임 분리
- Prisma 사용: DB 모델 관리는 Prisma로 수행
- 확장성: 파이프라인 블록, 빌드, 테스트, 배포 디렉토리로 새로운 기능 추가 용이
- 유지보수성: controllers, services, dtos로 책임 분리, common 디렉토리로 공통 로직 중앙화
- CI/CD 특성 반영: 파이프라인 흐름(Block → Build → Test → Deploy) 구조화
- 환경 관리: environments 모듈과 .env 파일로 언어 및 배포 환경 설정 지원
- 테스팅: test 디렉토리로 Unit/E2E 테스트를 도메인별로 체계적 관리

---

## 파이프라인 흐름 (ASCII 도식)

```

+-----------------+
|   Project 생성   |
+-----------------+
          |
          v
+-----------------------------+
| 파이프라인 구성 (블록 코딩) |
+-----------------------------+
          |
          v
+-----------------+
|     Build       |
+-----------------+
          |
          v
+-----------------+
|      Test       |
+-----------------+
          |
          v
+-----------------+
|     Deploy      |
+-----------------+


```

- Blocks(PaB): 블록 코딩 방식으로 파이프라인 구성  
- Build: 실시간 로그 및 빌드 결과 처리  
- Test: Unit 및 E2E 테스트 실행  
- Deploy: 배포 프로세스 및 로그 처리  

---

## 핵심 디렉토리 강조

- common/: 재사용 가능한 유틸, 인증/인가 가드, 로깅 등 공통 기능
- integrations/: 외부 서비스 연동(GitHub, AWS S3 등)
- pipelines/: CI/CD 워크플로우 관리, 직관적 이해 가능
- prisma/: Prisma 스키마 및 DB 접근 클라이언트 관리
```
