import type {
  OttoscalerServiceClient,
  OttoHandlerLogServiceClient,
  LogStreamingServiceClient,
} from '../../generated/otto';
import type { Observable } from 'rxjs';
import type {
  LogForwardResponse,
  WorkerLogEntry,
  LogResponse,
  LogEntry,
} from '../../generated/otto';

export interface OttoscalerClients {
  ottoscalerService: OttoscalerServiceClient;
  ottoHandlerLogService: OttoHandlerLogServiceClient;
  logStreamingService: LogStreamingServiceClient;
}

export interface ForwardWorkerLogsChannel {
  responses$: Observable<LogForwardResponse>;
  write: (entry: WorkerLogEntry) => void;
  end: () => void;
}

export interface LogStreamingChannel {
  responses$: Observable<LogResponse>;
  write: (entry: LogEntry) => void;
  end: () => void;
}
