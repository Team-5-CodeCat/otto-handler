import type { Observable } from 'rxjs';
// Types are imported in other files where needed
// import type {
//   WorkerLogEntry,
//   LogForwardResponse,
//   PipelineProgress,
//   LogEntry,
// } from '../../../generated/otto';

/**
 * 🏷 LogStreamingTypes
 *
 * 📋 목적:
 * - 로그 스트리밍 모듈에서 사용하는 모든 타입 정의
 * - gRPC proto 타입과 내부 비즈니스 로직 타입 연결
 * - 타입 안전성을 통한 개발 생산성 향상
 */

/**
 * 📨 SSE (Server-Sent Events) 메시지 타입
 *
 * 💼 비즈니스 목적:
 * - 웹 브라우저에서 실시간 로그를 표시하기 위한 표준 형식
 * - 프론트엔드 개발자가 쉽게 파싱할 수 있는 구조화된 데이터
 *
 * 🔧 기술적 구현:
 * - SSE 표준에 따른 event/data 구조
 * - JSON 직렬화 가능한 데이터만 포함
 */
export interface SSEMessage {
  // SSE 이벤트 타입 (log, progress, error, complete 등)
  event: string;

  // 실제 전송할 데이터 (JSON으로 직렬화됨)
  data: unknown;

  // 선택적: SSE ID (클라이언트 재연결 시 마지막 위치 추적)
  id?: string;

  // 선택적: 재시도 간격 (milliseconds)
  retry?: number;
}

/**
 * 🔄 로그 스트림 세션 정보
 *
 * 💼 비즈니스 목적:
 * - 각 클라이언트의 로그 구독 세션 관리
 * - 필터링 조건에 따라 개인화된 로그 스트림 제공
 * - 리소스 관리를 통한 서버 부하 최적화
 */
export interface LogStreamSession {
  // 세션 고유 ID (클라이언트 연결 추적용)
  sessionId: string;

  // 구독할 작업 ID (특정 CI/CD 작업의 로그만 수신)
  taskId?: string;

  // 구독할 Worker ID (특정 Worker Pod 로그만 수신)
  workerId?: string;

  // 로그 레벨 필터 (INFO, ERROR, DEBUG 등)
  logLevel?: string;

  // 세션 생성 시간
  createdAt: Date;

  // 마지막 활성화 시간 (세션 만료 관리)
  lastActivity: Date;
}

/**
 * 📊 파이프라인 실행 상태 정보
 *
 * 💼 비즈니스 목적:
 * - CI/CD 파이프라인 전체 진행 상황을 실시간으로 추적
 * - 개발자가 빌드/테스트/배포 단계별 상태를 모니터링
 * - 문제 발생 시 빠른 대응을 위한 상태 정보 제공
 */
export interface PipelineStatus {
  // 파이프라인 ID
  pipelineId: string;

  // 현재 실행 중인 스테이지
  currentStage?: string;

  // 전체 진행률 (0-100)
  progress: number;

  // 파이프라인 상태 (running, completed, failed, cancelled)
  status: string;

  // 실행 중인 Worker Pod 목록
  activeWorkers: string[];

  // 마지막 업데이트 시간
  lastUpdated: Date;
}

/**
 * 🎛 로그 필터 설정
 *
 * 💼 비즈니스 목적:
 * - 대용량 로그에서 필요한 정보만 선별적으로 표시
 * - 개발자별/팀별로 관심있는 로그만 모니터링
 * - 성능 최적화: 불필요한 로그 전송 방지
 */
export interface LogFilter {
  // 로그 레벨 필터 (복수 선택 가능)
  levels?: string[];

  // 로그 소스 필터 (stdout, stderr)
  sources?: string[];

  // 키워드 필터 (로그 메시지 내 특정 문자열 검색)
  keywords?: string[];

  // 시간 범위 필터
  startTime?: Date;
  endTime?: Date;

  // Worker ID 필터 (특정 Worker만)
  workerIds?: string[];

  // Task ID 필터 (특정 작업만)
  taskIds?: string[];
}

/**
 * 📡 실시간 스트리밍 채널 인터페이스
 *
 * 🔧 기술적 구현:
 * - gRPC 양방향 스트림과 HTTP SSE/WebSocket 간의 어댑터 역할
 * - Observable 패턴을 통한 반응형 프로그래밍 지원
 * - 백프레셔(Backpressure) 및 에러 핸들링 포함
 */
export interface StreamingChannel<T> {
  // 스트림에서 데이터 수신을 위한 Observable
  stream$: Observable<T>;

  // 스트림 연결 종료
  close(): void;

  // 스트림 상태 확인
  isActive(): boolean;

  // 에러 핸들러 등록
  onError(handler: (error: Error) => void): void;

  // 완료 핸들러 등록
  onComplete(handler: () => void): void;
}

/**
 * 🏪 로그 스트리밍 서비스 설정
 *
 * 💼 비즈니스 목적:
 * - 서비스 운영을 위한 각종 임계값 및 정책 설정
 * - 서버 리소스 보호 및 최적 성능 유지
 * - 사용자 경험과 시스템 안정성 간의 균형점 제공
 */
export interface LogStreamingConfig {
  // 최대 동시 연결 수 (서버 리소스 보호)
  maxConnections: number;

  // 세션 만료 시간 (분 단위)
  sessionTimeoutMinutes: number;

  // 로그 버퍼 크기 (메모리 사용량 제한)
  bufferSize: number;

  // SSE 연결 유지를 위한 heartbeat 간격 (초)
  heartbeatIntervalSeconds: number;

  // 백프레셔 임계값 (큐 크기)
  backpressureThreshold: number;

  // 로그 압축 여부
  enableCompression: boolean;

  // 디버그 모드 (상세 로그 출력)
  debugMode: boolean;
}

/**
 * 📈 로그 스트리밍 메트릭
 *
 * 💼 비즈니스 목적:
 * - 서비스 모니터링 및 성능 분석
 * - 장애 예방 및 빠른 문제 진단
 * - 사용 패턴 분석을 통한 서비스 개선
 */
export interface StreamingMetrics {
  // 현재 활성 연결 수
  activeConnections: number;

  // 초당 로그 메시지 처리량
  messagesPerSecond: number;

  // 평균 지연시간 (milliseconds)
  averageLatency: number;

  // 에러 발생률
  errorRate: number;

  // 메모리 사용량 (MB)
  memoryUsage: number;

  // 네트워크 대역폭 사용량 (bytes/sec)
  bandwidthUsage: number;
}
