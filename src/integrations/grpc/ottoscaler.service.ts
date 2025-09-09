import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type {
  OttoscalerClients,
  ForwardWorkerLogsChannel,
  LogStreamingChannel,
} from './ottoscaler.types';
import { OTTOSCALER_GRPC_TOKEN } from './ottoscaler.constants';
import type {
  ScaleRequest,
  ScaleResponse,
  WorkerStatusRequest,
  WorkerStatusResponse,
  PipelineRequest,
  PipelineProgress,
  LogEntry,
  LogResponse,
  WorkerLogEntry,
  LogForwardResponse,
} from '../../generated/otto';
import type { ClientReadableStream, Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

/**
 * OttoscalerService는 Otto Scaler와의 gRPC 통신을 담당하는 서비스입니다.
 *
 * 이 서비스는 다음과 같은 기능을 제공합니다:
 * - 워커 인스턴스 스케일링 (up/down)
 * - 워커 상태 조회
 * - 파이프라인 실행 및 진행 상황 스트리밍
 * - 로그 포워딩 및 스트리밍 (양방향 스트리밍)
 *
 * 모든 메서드는 gRPC 클라이언트를 통해 Otto Scaler와 통신하며,
 * Promise 또는 Observable/Stream 형태로 응답을 반환합니다.
 */
@Injectable()
export class OttoscalerService {
  private readonly logger = new Logger(OttoscalerService.name);

  /**
   * OttoscalerService 생성자
   * @param clients - 주입된 gRPC 클라이언트 인스턴스들
   *                  OttoscalerModule에서 제공하는 클라이언트 컬렉션
   */
  constructor(
    @Inject(OTTOSCALER_GRPC_TOKEN)
    private readonly clients: OttoscalerClients,
  ) {}

  /**
   * gRPC 클라이언트 참조를 반환합니다.
   * 직접적인 클라이언트 접근이 필요한 경우 사용됩니다.
   * @returns OttoscalerClients 인스턴스
   */
  get clientsRef() {
    return this.clients;
  }

  /**
   * 워커 인스턴스를 스케일 업합니다.
   *
   * @param request - ScaleRequest 스케일링 요청 정보
   *   - taskId: 작업 고유 식별자 (CI/CD 작업 ID)
   *   - repository: Git 저장소 URL
   *   - commitSha: Git 커밋 SHA
   *   - workerCount: 생성할 Worker Pod 수
   *   - buildConfig: CI/CD 빌드 설정 (환경 변수, 명령어 등)
   *   - triggeredBy: 요청을 시작한 주체 (사용자 또는 시스템)
   *   - reason: 스케일링 요청 사유
   *   - metadata: 추가 메타데이터
   * @param metadata - 선택적 gRPC 메타데이터 (인증, 추적 등)
   * @returns Promise<ScaleResponse> - 스케일링 응답
   *   - status: SUCCESS | FAILED | PARTIAL_SUCCESS | ALREADY_PROCESSED
   *   - message: 응답 메시지 (에러 정보 또는 성공 메시지)
   *   - processedCount: 실제로 처리된 Worker Pod 수
   *   - workerPodNames: 생성된 Worker Pod 이름 목록
   *   - startedAt: 처리 시작 시간 (RFC3339)
   *   - completedAt: 처리 완료 시간 (RFC3339)
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const response = await ottoscalerService.scaleUp({
   *   taskId: 'task-123',
   *   repository: 'https://github.com/user/repo',
   *   commitSha: 'abc123def',
   *   workerCount: 3,
   *   buildConfig: { NODE_ENV: 'production' },
   *   triggeredBy: 'user@example.com',
   *   reason: 'Manual trigger for production deployment',
   *   metadata: { priority: 'high' }
   * });
   */
  async scaleUp(
    request: ScaleRequest,
    metadata?: Metadata,
  ): Promise<ScaleResponse> {
    return new Promise<ScaleResponse>((resolve, reject) => {
      const cb = (err: unknown, res: ScaleResponse) =>
        err ? reject(err as Error) : resolve(res);
      return metadata
        ? this.clients.ottoscalerService.scaleUp(request, metadata, cb)
        : this.clients.ottoscalerService.scaleUp(request, cb);
    });
  }

  /**
   * 워커 인스턴스를 스케일 다운합니다.
   *
   * @param request - ScaleRequest 스케일링 요청 정보
   *   - taskId: 작업 고유 식별자
   *   - workerCount: 목표 Worker Pod 수 (현재보다 작은 수)
   *   - triggeredBy: 요청을 시작한 주체
   *   - reason: 스케일 다운 사유
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Promise<ScaleResponse> - 스케일링 응답
   *   - status: SUCCESS | FAILED | PARTIAL_SUCCESS
   *   - workerPodNames: 삭제된 Worker Pod 이름 목록
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const response = await ottoscalerService.scaleDown({
   *   taskId: 'task-123',
   *   workerCount: 1,
   *   triggeredBy: 'system',
   *   reason: 'Auto-scaling down due to low load',
   *   repository: '',
   *   commitSha: '',
   *   buildConfig: {},
   *   metadata: {}
   * });
   */
  async scaleDown(
    request: ScaleRequest,
    metadata?: Metadata,
  ): Promise<ScaleResponse> {
    return new Promise<ScaleResponse>((resolve, reject) => {
      const cb = (err: unknown, res: ScaleResponse) =>
        err ? reject(err as Error) : resolve(res);
      return metadata
        ? this.clients.ottoscalerService.scaleDown(request, metadata, cb)
        : this.clients.ottoscalerService.scaleDown(request, cb);
    });
  }

  /**
   * 워커들의 상태를 조회합니다.
   *
   * @param request - WorkerStatusRequest 조회 요청
   *   - taskId: 특정 작업 ID로 필터링 (비어있으면 전체 조회)
   *   - workerPodName: 특정 Worker Pod 이름으로 필터링
   *   - statusFilter: 상태로 필터링 ("running", "pending", "succeeded", "failed")
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Promise<WorkerStatusResponse> - 워커 상태 응답
   *   - totalCount: 전체 Worker Pod 수
   *   - runningCount: 실행 중인 Pod 수
   *   - pendingCount: 대기 중인 Pod 수
   *   - succeededCount: 성공한 Pod 수
   *   - failedCount: 실패한 Pod 수
   *   - workers: WorkerPodStatus[] 상세 정보 배열
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const status = await ottoscalerService.getWorkerStatus({
   *   taskId: 'task-123',
   *   workerPodName: '',
   *   statusFilter: 'running'
   * });
   * console.log(`Running workers: ${status.runningCount}/${status.totalCount}`);
   */
  async getWorkerStatus(
    request: WorkerStatusRequest,
    metadata?: Metadata,
  ): Promise<WorkerStatusResponse> {
    return new Promise<WorkerStatusResponse>((resolve, reject) => {
      const cb = (err: unknown, res: WorkerStatusResponse) =>
        err ? reject(err as Error) : resolve(res);
      return metadata
        ? this.clients.ottoscalerService.getWorkerStatus(request, metadata, cb)
        : this.clients.ottoscalerService.getWorkerStatus(request, cb);
    });
  }

  /**
   * 파이프라인을 실행하고 진행 상황을 스트리밍으로 받습니다.
   *
   * @param request - PipelineRequest 실행 요청
   *   - pipelineId: Pipeline 고유 ID
   *   - name: Pipeline 이름 (예: "Full CI/CD", "Build and Test")
   *   - stages: PipelineStage[] 실행할 Stage 목록
   *   - repository: Git 저장소 URL
   *   - commitSha: 커밋 SHA
   *   - triggeredBy: 트리거한 사용자/시스템
   *   - metadata: Pipeline 메타데이터
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns ClientReadableStream<PipelineProgress> - 진행 상황 스트림
   *   각 PipelineProgress는 다음을 포함:
   *   - pipelineId: Pipeline ID
   *   - stageId: 현재 Stage ID
   *   - status: StageStatus (PENDING|RUNNING|COMPLETED|FAILED|CANCELLED|SKIPPED|RETRYING)
   *   - progressPercentage: 진행률 (0-100)
   *   - workerPodNames: 이 Stage의 Worker Pod 이름들
   *   - metrics: Stage 실행 메트릭 (CPU, 메모리, 시간 등)
   *
   * @example
   * const stream = ottoscalerService.executePipeline({
   *   pipelineId: 'pipeline-123',
   *   name: 'Production Deployment',
   *   stages: [
   *     { stageId: 'build', type: StageType.STAGE_TYPE_BUILD, name: 'Build', workerCount: 2, ... },
   *     { stageId: 'test', type: StageType.STAGE_TYPE_TEST, name: 'Test', workerCount: 4, ... }
   *   ],
   *   repository: 'https://github.com/user/repo',
   *   commitSha: 'abc123',
   *   triggeredBy: 'user@example.com',
   *   metadata: { environment: 'production' }
   * });
   *
   * stream.on('data', (progress) => {
   *   console.log(`Stage ${progress.stageId}: ${progress.status} - ${progress.progressPercentage}%`);
   * });
   */
  executePipeline(
    request: PipelineRequest,
    metadata?: Metadata,
  ): ClientReadableStream<PipelineProgress> {
    return metadata
      ? this.clients.ottoscalerService.executePipeline(request, metadata)
      : this.clients.ottoscalerService.executePipeline(request);
  }

  /**
   * 파이프라인 실행을 Observable로 래핑합니다.
   * Server-Sent Events (SSE)나 WebSocket으로 전달하기에 이상적입니다.
   *
   * @param request - PipelineRequest 실행 요청 (executePipeline과 동일)
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Observable<PipelineProgress> - RxJS Observable 형태의 진행 상황
   *
   * @example
   * ottoscalerService.executePipeline$({
   *   pipelineId: 'pipeline-123',
   *   name: 'CI/CD Pipeline',
   *   stages: [...],
   *   repository: 'https://github.com/user/repo',
   *   commitSha: 'abc123',
   *   triggeredBy: 'webhook',
   *   metadata: {}
   * })
   * .pipe(
   *   tap(progress => {
   *     if (progress.status === StageStatus.FAILED) {
   *       console.error(`Stage ${progress.stageId} failed: ${progress.errorMessage}`);
   *     }
   *   }),
   *   catchError(err => {
   *     console.error('Stream error:', err);
   *     return EMPTY;
   *   })
   * )
   * .subscribe();
   *
   * @note 구독 해제 시 자동으로 스트림이 정리됩니다.
   */
  executePipeline$(
    request: PipelineRequest,
    metadata?: Metadata,
  ): Observable<PipelineProgress> {
    return new Observable<PipelineProgress>((subscriber) => {
      const stream = this.executePipeline(request, metadata);
      const onData = (data: PipelineProgress) => subscriber.next(data);
      const onError = (err: unknown) => subscriber.error(err);
      const onEnd = () => subscriber.complete();

      stream.on('data', onData);
      stream.on('error', onError as (err: Error) => void);
      stream.on('end', onEnd);

      return () => {
        // Teardown: 리스너 제거 및 스트림 취소
        stream.off('data', onData);
        stream.off('error', onError as (err: Error) => void);
        stream.off('end', onEnd);
        const maybeCancelable = stream as unknown as { cancel?: () => void };
        if (typeof maybeCancelable.cancel === 'function') {
          maybeCancelable.cancel();
        }
      };
    });
  }

  /**
   * Worker에서 Handler로 로그를 포워딩하는 양방향 스트리밍 채널을 생성합니다.
   * Ottoscaler가 Worker Pod의 로그를 수집해서 Handler로 전달할 때 사용됩니다.
   *
   * @returns ForwardWorkerLogsChannel - 양방향 스트리밍 채널 객체
   *   - responses$: Observable<LogForwardResponse> Handler로부터의 응답
   *     - status: ACK | RETRY | DROP
   *     - message: 응답 메시지
   *     - sequence: 순서 번호
   *     - throttleMs: 백프레셔 제어 (다음 로그까지 대기 시간)
   *   - write(entry: WorkerLogEntry): Worker 로그 전송
   *     - workerId: Worker Pod의 고유 식별자
   *     - taskId: 작업 식별자 (CI/CD 작업 ID)
   *     - timestamp: 로그 생성 시간 (RFC3339)
   *     - level: 로그 레벨 (INFO, ERROR, DEBUG, WARN)
   *     - source: 로그 소스 (stdout, stderr)
   *     - message: 실제 로그 메시지
   *     - podMetadata: Pod 관련 메타데이터
   *     - metadata: 추가 메타데이터
   *   - end(): 스트리밍 종료
   *
   * @example
   * const channel = ottoscalerService.createForwardWorkerLogsChannel();
   *
   * // 응답 처리 (백프레셔 적용)
   * channel.responses$.subscribe(response => {
   *   if (response.status === LogForwardResponse_Status.RETRY) {
   *     // 재시도 로직
   *     setTimeout(() => retryLog(), response.throttleMs);
   *   } else if (response.status === LogForwardResponse_Status.ACK) {
   *     console.log('Log acknowledged');
   *   }
   * });
   *
   * // Worker 로그 전송
   * channel.write({
   *   workerId: 'otto-agent-1-abc123',
   *   taskId: 'task-456',
   *   timestamp: new Date().toISOString(),
   *   level: 'INFO',
   *   source: 'stdout',
   *   message: 'Building Docker image...',
   *   podMetadata: {
   *     podName: 'otto-agent-1-abc123',
   *     namespace: 'default',
   *     nodeName: 'node-1',
   *     createdAt: '2025-01-01T00:00:00Z',
   *     labels: { app: 'otto-worker', taskId: 'task-456' }
   *   },
   *   metadata: { step: 'build', phase: 'docker' }
   * });
   */
  createForwardWorkerLogsChannel(): ForwardWorkerLogsChannel {
    const duplex = this.clients.ottoHandlerLogService.forwardWorkerLogs();
    const responses$ = new Observable<LogForwardResponse>((subscriber) => {
      const onData = (data: LogForwardResponse) => subscriber.next(data);
      const onError = (err: unknown) => subscriber.error(err);
      const onEnd = () => subscriber.complete();
      duplex.on('data', onData);
      duplex.on('error', onError as (err: Error) => void);
      duplex.on('end', onEnd);
      return () => {
        duplex.off('data', onData);
        duplex.off('error', onError as (err: Error) => void);
        duplex.off('end', onEnd);
        duplex.end();
      };
    });
    return {
      responses$,
      write: (entry: WorkerLogEntry) => duplex.write(entry),
      end: () => duplex.end(),
    };
  }

  /**
   * 일반 로그 스트리밍을 위한 양방향 채널을 생성합니다.
   * Worker Pod에서 직접 Handler로 로그를 스트리밍할 때 사용됩니다.
   *
   * @returns LogStreamingChannel - 로그 스트리밍 채널 객체
   *   - responses$: Observable<LogResponse> Handler로부터의 응답
   *     - status: ACK | RETRY | DROP
   *     - message: 디버깅용 메시지
   *     - sequence: 순서 보장을 위한 시퀀스 번호
   *   - write(entry: LogEntry): 로그 엔트리 전송
   *     - workerId: Worker Pod의 고유 식별자 (예: "otto-agent-1-abc123")
   *     - taskId: Redis 이벤트의 작업 식별자 (예: "task-456")
   *     - timestamp: 로그 생성 시간 (RFC3339 형식)
   *     - level: 로그 레벨 (INFO, ERROR, DEBUG, WARN)
   *     - source: 로그 소스 (stdout, stderr)
   *     - message: 실제 로그 메시지 (Worker Pod의 작업 진행 상황)
   *     - metadata: 추가 메타데이터 (작업 단계, 파일명, 함수명 등)
   *   - end(): 스트리밍 종료
   *
   * @example
   * const channel = ottoscalerService.createLogStreamingChannel();
   *
   * // 로그 응답 처리 (ACK/RETRY/DROP)
   * channel.responses$.subscribe({
   *   next: (response) => {
   *     switch(response.status) {
   *       case LogResponse_Status.ACK:
   *         // 성공적으로 처리됨, 다음 로그 전송 가능
   *         break;
   *       case LogResponse_Status.RETRY:
   *         // 일시적 실패, 같은 로그 재전송 필요
   *         retryLastLog();
   *         break;
   *       case LogResponse_Status.DROP:
   *         // 영구적 실패, 해당 로그 포기하고 다음으로
   *         skipCurrentLog();
   *         break;
   *     }
   *   },
   *   error: (err) => console.error('Streaming error:', err),
   *   complete: () => console.log('Streaming completed')
   * });
   *
   * // Worker Pod 로그 전송
   * channel.write({
   *   workerId: 'otto-agent-1-abc123',
   *   taskId: 'task-456',
   *   timestamp: '2025-01-01T12:34:56.789Z',
   *   level: 'INFO',
   *   source: 'stdout',
   *   message: 'Cloning repository...',
   *   metadata: {
   *     step: 'initialization',
   *     repo: 'https://github.com/user/repo'
   *   }
   * });
   *
   * // 작업 완료 시 스트림 종료
   * channel.end();
   *
   * @note
   * - 백프레셔 처리: 서버 과부하 시 RETRY 응답으로 Worker Pod 전송 속도 조절
   * - sequence 번호로 로그 순서 보장
   * - 구독 해제 시 자동으로 duplex 스트림이 종료됩니다.
   */
  createLogStreamingChannel(): LogStreamingChannel {
    const duplex = this.clients.logStreamingService.streamLogs();
    const responses$ = new Observable<LogResponse>((subscriber) => {
      const onData = (data: LogResponse) => subscriber.next(data);
      const onError = (err: unknown) => subscriber.error(err);
      const onEnd = () => subscriber.complete();
      duplex.on('data', onData);
      duplex.on('error', onError as (err: Error) => void);
      duplex.on('end', onEnd);
      return () => {
        duplex.off('data', onData);
        duplex.off('error', onError as (err: Error) => void);
        duplex.off('end', onEnd);
        duplex.end();
      };
    });
    return {
      responses$,
      write: (entry: LogEntry) => duplex.write(entry),
      end: () => duplex.end(),
    };
  }
}
