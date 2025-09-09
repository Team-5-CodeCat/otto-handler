import type { Observable } from 'rxjs';
import type {
  LogStreamSession,
  LogFilter,
  StreamingMetrics,
} from '../types/log-streaming.types';
import type { WorkerLogEntry, PipelineProgress } from '../../../generated/otto';

/**
 * 🔌 ILogStreamingService
 *
 * 📋 목적:
 * - 로그 스트리밍 서비스의 핵심 인터페이스 정의
 * - 구현체와 사용처 간의 결합도를 낮추는 추상화 계층
 * - 테스트 가능성 향상 및 의존성 주입 지원
 *
 * 💼 비즈니스 가치:
 * - 실시간 CI/CD 로그 모니터링의 핵심 기능 정의
 * - 개발자가 빌드/테스트/배포 과정을 실시간으로 추적
 * - 문제 발생 시 즉시 대응할 수 있는 알림 시스템 기반 제공
 */
export interface ILogStreamingService {
  /**
   * 🔄 Worker 로그 스트림 시작
   *
   * 💼 비즈니스 목적:
   * - 특정 CI/CD 작업의 Worker Pod 로그를 실시간으로 수집
   * - 개발자가 빌드 진행 상황을 즉시 확인할 수 있게 지원
   *
   * 🔧 기술적 구현:
   * - gRPC 스트림에서 로그 수신 → RxJS Observable로 변환
   * - 백프레셔 처리 및 에러 복구 메커니즘 포함
   *
   * @param taskId 작업 ID (CI/CD 파이프라인 실행 단위)
   * @param filter 로그 필터링 조건 (레벨, 키워드 등)
   * @returns Worker 로그 엔트리의 Observable 스트림
   */
  startWorkerLogStream(
    taskId: string,
    filter?: LogFilter,
  ): Observable<WorkerLogEntry>;

  /**
   * 📊 파이프라인 진행 상황 스트림 시작
   *
   * 💼 비즈니스 목적:
   * - CI/CD 파이프라인의 전체 진행 상황을 실시간으로 추적
   * - 각 스테이지(빌드→테스트→배포)별 상태 변화 모니터링
   *
   * 🔧 기술적 구현:
   * - gRPC ExecutePipeline 스트림 활용
   * - 진행률, 상태, 에러 정보 등을 구조화하여 전달
   *
   * @param pipelineId 파이프라인 고유 ID
   * @returns 파이프라인 진행 상황의 Observable 스트림
   */
  startPipelineProgressStream(pipelineId: string): Observable<PipelineProgress>;

  /**
   * 👤 클라이언트 세션 생성
   *
   * 💼 비즈니스 목적:
   * - 개별 사용자/브라우저별로 독립적인 로그 스트림 제공
   * - 사용자별 필터링 설정 및 개인화된 모니터링 환경 지원
   *
   * 🔧 기술적 구현:
   * - 세션 ID 생성 및 메모리/Redis에 세션 정보 저장
   * - 세션별 리소스 할당 및 생명주기 관리
   *
   * @param filter 세션별 로그 필터링 설정
   * @returns 생성된 세션 정보
   */
  createSession(filter?: LogFilter): Promise<LogStreamSession>;

  /**
   * 🗑 클라이언트 세션 종료
   *
   * 💼 비즈니스 목적:
   * - 사용자가 로그 모니터링을 중단할 때 리소스 정리
   * - 메모리 누수 방지 및 서버 성능 최적화
   *
   * 🔧 기술적 구현:
   * - 세션 관련 Observable 구독 해제
   * - 메모리/캐시에서 세션 정보 제거
   * - gRPC 연결 정리 (필요시)
   *
   * @param sessionId 종료할 세션 ID
   */
  closeSession(sessionId: string): Promise<void>;

  /**
   * 🎛 세션 필터 업데이트
   *
   * 💼 비즈니스 목적:
   * - 실시간으로 로그 필터링 조건을 변경
   * - 사용자가 원하는 로그만 선별적으로 모니터링
   *
   * 🔧 기술적 구현:
   * - 기존 스트림을 중단하지 않고 필터 조건만 업데이트
   * - RxJS filter/map 연산자를 동적으로 적용
   *
   * @param sessionId 대상 세션 ID
   * @param filter 새로운 필터링 조건
   */
  updateSessionFilter(sessionId: string, filter: LogFilter): Promise<void>;

  /**
   * 📈 실시간 메트릭 조회
   *
   * 💼 비즈니스 목적:
   * - 시스템 관리자가 로그 스트리밍 서비스 상태를 모니터링
   * - 성능 문제 예방 및 리소스 사용량 최적화
   *
   * 🔧 기술적 구현:
   * - 메모리 내 메트릭 수집기에서 실시간 데이터 조회
   * - Prometheus/Grafana 연동 준비
   *
   * @returns 현재 서비스 메트릭 정보
   */
  getMetrics(): Promise<StreamingMetrics>;
}

/**
 * 🌐 ILogStreamingController
 *
 * 📋 목적:
 * - HTTP 기반 로그 스트리밍 API의 인터페이스 정의
 * - SSE(Server-Sent Events)를 통한 웹 브라우저 연동
 * - RESTful API와 실시간 스트리밍의 통합 인터페이스
 */
export interface ILogStreamingController {
  /**
   * 📡 SSE 로그 스트림 연결
   *
   * 💼 비즈니스 목적:
   * - 웹 브라우저에서 EventSource API로 실시간 로그 수신
   * - 별도 라이브러리 없이 표준 웹 기술만으로 실시간 모니터링
   *
   * 🔧 기술적 구현:
   * - HTTP Response를 스트림으로 유지
   * - text/event-stream Content-Type 설정
   * - SSE 표준 형식으로 데이터 전송
   *
   * @param taskId 모니터링할 작업 ID
   * @param level 로그 레벨 필터
   * @param keywords 키워드 필터
   * @param workerId Worker ID 필터
   * @param response Fastify Response 객체
   */
  streamLogs(
    taskId: string,
    response?: any,
    level?: string,
    keywords?: string,
    workerId?: string,
  ): void;

  /**
   * 📊 SSE 파이프라인 진행 상황 스트림
   *
   * 💼 비즈니스 목적:
   * - 웹 대시보드에서 CI/CD 파이프라인 상태를 실시간으로 표시
   * - 진행률 바, 스테이지별 상태 표시 등 UI 컴포넌트 지원
   *
   * @param pipelineId 파이프라인 ID
   * @param response Fastify Response 객체
   */
  streamPipelineProgress(pipelineId: string, response?: any): void;

  /**
   * 🏥 헬스체크 엔드포인트
   *
   * 💼 비즈니스 목적:
   * - 로드밸런서/모니터링 시스템에서 서비스 상태 확인
   * - 장애 발생 시 자동 복구 시스템 연동
   *
   * @returns 서비스 상태 정보
   */
  getHealth(): Promise<{
    status: string;
    timestamp: Date;
    activeConnections: number;
  }>;
}

/**
 * 🔌 ILogStreamingGateway
 *
 * 📋 목적:
 * - WebSocket 기반 양방향 실시간 통신 인터페이스
 * - Socket.IO를 통한 고급 실시간 기능 제공
 * - 브라우저↔서버 간 양방향 로그 스트리밍 및 제어
 */
export interface ILogStreamingGateway {
  /**
   * 🤝 클라이언트 연결 이벤트 처리
   *
   * 💼 비즈니스 목적:
   * - 새로운 사용자가 실시간 로그 모니터링에 참여
   * - 사용자별 세션 초기화 및 권한 확인
   *
   * @param client WebSocket 클라이언트 객체
   * @param authToken 인증 토큰 (JWT)
   */
  handleConnection(client: any, authToken?: string): Promise<void>;

  /**
   * 👋 클라이언트 연결 종료 이벤트 처리
   *
   * 💼 비즈니스 목적:
   * - 사용자가 브라우저를 닫거나 페이지를 벗어날 때 리소스 정리
   * - 서버 메모리 누수 방지
   *
   * @param client 연결 종료된 클라이언트
   */
  handleDisconnection(client: any): Promise<void>;

  /**
   * 📝 로그 구독 요청 처리
   *
   * 💼 비즈니스 목적:
   * - 클라이언트가 특정 작업의 로그 스트림을 요청
   * - 실시간으로 필터 조건 변경 가능
   *
   * @param client 요청한 클라이언트
   * @param payload 구독 요청 데이터 (taskId, filter 등)
   */
  handleSubscribeToLogs(
    client: any,
    payload: {
      taskId: string;
      filter?: LogFilter;
    },
  ): Promise<void>;

  /**
   * 🚫 로그 구독 해제 처리
   *
   * 💼 비즈니스 목적:
   * - 특정 작업의 로그 스트림 구독을 중단
   * - 불필요한 네트워크 트래픽 및 서버 리소스 절약
   *
   * @param client 요청한 클라이언트
   * @param payload 구독 해제 요청 데이터
   */
  handleUnsubscribeFromLogs(
    client: any,
    payload: {
      taskId: string;
    },
  ): Promise<void>;

  /**
   * 📡 실시간 로그 브로드캐스트
   *
   * 💼 비즈니스 목적:
   * - 새로운 로그가 도착했을 때 구독 중인 모든 클라이언트에게 전송
   * - 팀 단위 협업: 여러 개발자가 동일한 빌드를 동시에 모니터링
   *
   * 🔧 기술적 구현:
   * - Room 기반 브로드캐스트 (taskId별로 그룹핑)
   * - 클라이언트별 필터 적용 후 선별적 전송
   *
   * @param taskId 대상 작업 ID
   * @param logEntry 브로드캐스트할 로그 엔트리
   */
  broadcastLog(taskId: string, logEntry: WorkerLogEntry): void;

  /**
   * 📊 파이프라인 상태 브로드캐스트
   *
   * 💼 비즈니스 목적:
   * - 파이프라인 진행 상황 변화를 모든 관련 사용자에게 실시간 알림
   * - 프로젝트 관리자, 개발팀이 빌드 상태를 공유
   *
   * @param pipelineId 대상 파이프라인 ID
   * @param progress 진행 상황 정보
   */
  broadcastPipelineProgress(
    pipelineId: string,
    progress: PipelineProgress,
  ): void;
}
