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
   * @param request - 스케일링 요청 정보 (인스턴스 수, 타입 등)
   * @param metadata - 선택적 gRPC 메타데이터 (인증, 추적 등)
   * @returns Promise<ScaleResponse> - 스케일링 결과
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const response = await ottoscalerService.scaleUp({
   *   instanceCount: 3,
   *   instanceType: 't2.micro'
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
   * @param request - 스케일링 요청 정보 (감소할 인스턴스 수 등)
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Promise<ScaleResponse> - 스케일링 결과
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const response = await ottoscalerService.scaleDown({
   *   instanceCount: 1
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
   * 특정 워커의 상태를 조회합니다.
   *
   * @param request - 워커 상태 조회 요청 (워커 ID, 필터 등)
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Promise<WorkerStatusResponse> - 워커 상태 정보
   * @throws gRPC 통신 오류 발생 시 Error
   *
   * @example
   * const status = await ottoscalerService.getWorkerStatus({
   *   workerId: 'worker-123'
   * });
   * console.log(status.status); // 'running', 'idle', etc.
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
   * @param request - 파이프라인 실행 요청 (파이프라인 ID, 설정 등)
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns ClientReadableStream<PipelineProgress> - 진행 상황 스트림
   *
   * @example
   * const stream = ottoscalerService.executePipeline({ pipelineId: '123' });
   * stream.on('data', (progress) => console.log(progress));
   * stream.on('end', () => console.log('Pipeline completed'));
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
   * @param request - 파이프라인 실행 요청
   * @param metadata - 선택적 gRPC 메타데이터
   * @returns Observable<PipelineProgress> - RxJS Observable 형태의 진행 상황
   *
   * @example
   * ottoscalerService.executePipeline$({ pipelineId: '123' })
   *   .pipe(
   *     tap(progress => console.log('Progress:', progress)),
   *     catchError(err => { console.error(err); return EMPTY; })
   *   )
   *   .subscribe();
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
   *
   * 이 메서드는 Worker가 생성한 로그를 실시간으로 Handler로 전송하고,
   * Handler로부터 응답을 받을 수 있는 양방향 통신 채널을 제공합니다.
   *
   * @returns ForwardWorkerLogsChannel - 양방향 스트리밍 채널 객체
   *   - responses$: Handler로부터의 응답을 받는 Observable
   *   - write(): Worker 로그를 전송하는 함수
   *   - end(): 스트리밍을 종료하는 함수
   *
   * @example
   * const channel = ottoscalerService.createForwardWorkerLogsChannel();
   *
   * // 응답 구독
   * channel.responses$.subscribe(response => {
   *   console.log('Handler response:', response);
   * });
   *
   * // 로그 전송
   * channel.write({
   *   workerId: 'worker-123',
   *   logLevel: 'INFO',
   *   message: 'Task completed',
   *   timestamp: new Date()
   * });
   *
   * // 스트리밍 종료
   * channel.end();
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
   *
   * Worker에서 NestJS Handler로 로그를 실시간 스트리밍하며,
   * 파이프라인 실행 중 발생하는 모든 로그를 처리합니다.
   *
   * @returns LogStreamingChannel - 로그 스트리밍 채널 객체
   *   - responses$: 로그 응답을 받는 Observable
   *   - write(): 로그 엔트리를 전송하는 함수
   *   - end(): 스트리밍을 종료하는 함수
   *
   * @example
   * const channel = ottoscalerService.createLogStreamingChannel();
   *
   * // 로그 응답 처리
   * channel.responses$.subscribe({
   *   next: (response) => {
   *     if (response.status === 'received') {
   *       console.log('Log received by Handler');
   *     }
   *   },
   *   error: (err) => console.error('Streaming error:', err),
   *   complete: () => console.log('Streaming completed')
   * });
   *
   * // 로그 전송
   * channel.write({
   *   pipelineId: 'pipeline-456',
   *   jobId: 'job-789',
   *   level: 'DEBUG',
   *   message: 'Processing step 1',
   *   timestamp: Date.now()
   * });
   *
   * // 완료 시 스트림 종료
   * channel.end();
   *
   * @note 구독 해제 시 자동으로 duplex 스트림이 종료됩니다.
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
