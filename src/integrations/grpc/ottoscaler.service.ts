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

@Injectable()
export class OttoscalerService {
  private readonly logger = new Logger(OttoscalerService.name);

  constructor(
    @Inject(OTTOSCALER_GRPC_TOKEN)
    private readonly clients: OttoscalerClients,
  ) {}

  get clientsRef() {
    return this.clients;
  }

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

  executePipeline(
    request: PipelineRequest,
    metadata?: Metadata,
  ): ClientReadableStream<PipelineProgress> {
    return metadata
      ? this.clients.ottoscalerService.executePipeline(request, metadata)
      : this.clients.ottoscalerService.executePipeline(request);
  }

  // Observable wrapper for server-streaming → ideal for SSE piping
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
        // Teardown: remove listeners and cancel stream when available
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

  // Bidirectional streaming: adapter returning write/complete with Observable of responses
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

  // Bidirectional streaming for Worker → NestJS logs
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
