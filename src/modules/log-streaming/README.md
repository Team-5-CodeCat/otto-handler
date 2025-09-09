# 🔄 Log Streaming Module

## 📋 개요

Otto Handler의 실시간 로그 스트리밍 모듈입니다. CI/CD 파이프라인 실행 중 발생하는 로그를 실시간으로 수집하고, 웹 클라이언트에게 다양한 방식(SSE, WebSocket)으로 전송합니다.

## 🏗 아키텍처

```
┌─────────────────┐    gRPC     ┌─────────────────┐    SSE/WS    ┌─────────────────┐
│   Worker Pods   │ ────────→   │ LogStreaming    │ ────────→    │   Web Clients   │
│ (Ottoscaler)    │             │    Service      │              │  (Browsers)     │
└─────────────────┘             └─────────────────┘              └─────────────────┘
```

### 🔄 데이터 플로우

1. **로그 수집**: Worker Pod → gRPC → LogStreamingService
2. **필터링**: 로그 레벨, 키워드, Worker ID 등으로 필터링
3. **브로드캐스트**: SSE/WebSocket을 통해 구독 클라이언트에게 전송
4. **세션 관리**: 클라이언트별 독립적인 로그 스트림 세션

## 📁 폴더 구조

```
src/modules/log-streaming/
├── log-streaming.module.ts      # 모듈 정의
├── services/
│   └── log-streaming.service.ts # 핵심 비즈니스 로직
├── controllers/
│   └── log-streaming.controller.ts # HTTP SSE API
├── gateways/
│   └── log-streaming.gateway.ts # WebSocket 게이트웨이
├── interfaces/
│   └── log-streaming.interface.ts # 인터페이스 정의
├── types/
│   └── log-streaming.types.ts   # 타입 정의
├── index.ts                     # 배럴 Export
└── README.md                    # 문서 (현재 파일)
```

## 🔌 주요 컴포넌트

### 1. LogStreamingService
- **목적**: 로그 스트리밍의 핵심 비즈니스 로직
- **기능**: 
  - gRPC 로그 수신 및 Observable 변환
  - 클라이언트 세션 관리
  - 로그 필터링 및 라우팅
  - 메트릭 수집 및 모니터링

### 2. LogStreamingController
- **목적**: HTTP Server-Sent Events API 제공
- **엔드포인트**:
  - `GET /api/v1/log-streaming/logs/:taskId/stream` - 로그 스트림
  - `GET /api/v1/log-streaming/pipelines/:pipelineId/progress` - 파이프라인 진행 상황
  - `GET /api/v1/log-streaming/health` - 헬스체크

### 3. LogStreamingGateway
- **목적**: WebSocket 양방향 실시간 통신
- **이벤트**:
  - `subscribe-to-logs` - 로그 구독
  - `unsubscribe-from-logs` - 로그 구독 해제
  - `update-log-filter` - 필터 업데이트
  - `subscribe-to-pipeline` - 파이프라인 구독

## 🚀 사용법

### HTTP SSE 클라이언트

```javascript
// 특정 작업의 로그 스트리밍
const eventSource = new EventSource(
  '/api/v1/log-streaming/logs/task-123/stream?level=ERROR&keywords=build,test'
);

eventSource.onmessage = (event) => {
  const logData = JSON.parse(event.data);
  console.log('새 로그:', logData);
};

eventSource.addEventListener('error', (event) => {
  console.error('로그 스트림 에러:', event);
});
```

### WebSocket 클라이언트

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3001/log-streaming', {
  auth: {
    token: 'your-jwt-token'
  }
});

// 로그 구독
socket.emit('subscribe-to-logs', {
  taskId: 'task-123',
  filter: {
    levels: ['INFO', 'ERROR'],
    keywords: ['build']
  }
});

// 로그 수신
socket.on('log-entry', (logData) => {
  console.log('새 로그:', logData);
});

// 파이프라인 진행 상황 구독
socket.emit('subscribe-to-pipeline', {
  pipelineId: 'pipeline-456'
});

socket.on('pipeline-progress', (progress) => {
  console.log('파이프라인 진행:', progress);
});
```

## ⚙️ 설정

### 환경 변수

```bash
# JWT 인증 (선택적)
JWT_SECRET=your-secret-key

# 로그 레벨
LOG_LEVEL=debug

# WebSocket 포트 (기본: 3001)
WEBSOCKET_PORT=3001
```

### 서비스 설정

```typescript
// log-streaming.service.ts 내부 설정
private readonly config: LogStreamingConfig = {
  maxConnections: 1000,           // 최대 동시 연결 수
  sessionTimeoutMinutes: 30,      // 세션 만료 시간
  bufferSize: 1000,              // 로그 버퍼 크기
  heartbeatIntervalSeconds: 30,   // SSE heartbeat 간격
  backpressureThreshold: 500,     // 백프레셔 임계값
  enableCompression: true,        // 압축 활성화
  debugMode: process.env.NODE_ENV === 'development',
};
```

## 🔍 필터링 옵션

### LogFilter 타입

```typescript
interface LogFilter {
  levels?: string[];      // ['INFO', 'ERROR', 'DEBUG', 'WARN']
  sources?: string[];     // ['stdout', 'stderr']
  keywords?: string[];    // 키워드 검색
  startTime?: Date;       // 시작 시간
  endTime?: Date;         // 종료 시간
  workerIds?: string[];   // Worker Pod ID 필터
  taskIds?: string[];     // Task ID 필터
}
```

### 사용 예시

```javascript
// HTTP SSE
const eventSource = new EventSource(
  '/api/v1/log-streaming/logs/task-123/stream?' +
  'level=ERROR&keywords=build,test&workerId=worker-1'
);

// WebSocket
socket.emit('subscribe-to-logs', {
  taskId: 'task-123',
  filter: {
    levels: ['ERROR', 'WARN'],
    keywords: ['build', 'test', 'deploy'],
    sources: ['stderr']
  }
});
```

## 📊 모니터링

### 메트릭 정보

- `activeConnections`: 현재 활성 연결 수
- `messagesPerSecond`: 초당 메시지 처리량
- `averageLatency`: 평균 지연시간
- `errorRate`: 에러 발생률
- `memoryUsage`: 메모리 사용량

### 헬스체크

```bash
curl http://localhost:4000/api/v1/log-streaming/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-09-08T10:30:00.000Z",
  "activeConnections": 42
}
```

## 🔧 개발 및 디버깅

### 디버그 로그 활성화

```bash
NODE_ENV=development pnpm run start:dev
```

### WebSocket 테스트

```javascript
// 브라우저 콘솔에서 테스트
const socket = io('ws://localhost:3001/log-streaming');

socket.on('connect', () => {
  console.log('WebSocket 연결됨');
  
  socket.emit('subscribe-to-logs', {
    taskId: 'test-task',
    filter: { levels: ['INFO'] }
  });
});

socket.on('log-entry', console.log);
```

## 🚨 에러 처리

### 일반적인 에러 및 해결책

1. **연결 실패**
   - JWT 토큰 확인
   - CORS 설정 확인
   - 포트 충돌 확인

2. **로그 누락**
   - gRPC 연결 상태 확인
   - 필터 조건 검토
   - 백프레셔 임계값 조정

3. **메모리 사용량 증가**
   - 세션 만료 시간 단축
   - 버퍼 크기 조정
   - 비활성 연결 정리

## 🔮 향후 계획

- [ ] Redis 기반 세션 관리 (다중 인스턴스 지원)
- [ ] Prometheus 메트릭 연동
- [ ] 로그 압축 알고리즘 최적화
- [ ] 클라이언트 SDK 제공 (React, Vue)
- [ ] 로그 히스토리 조회 API
- [ ] 알림 규칙 엔진 (로그 패턴 기반 알림)

## 📞 문의 및 지원

개발팀 내부 문서이므로 질문이나 개선 사항이 있으면 팀 채널에서 논의해 주세요.

---

*이 문서는 Otto Handler Log Streaming Module v1.0 기준으로 작성되었습니다.*