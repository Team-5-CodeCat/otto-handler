/**
 * 🔄 Log Streaming Module - 통합 Export
 * 
 * 📋 목적:
 * - 로그 스트리밍 모듈의 모든 공개 API를 한 곳에서 export
 * - 다른 모듈에서 간편하게 import할 수 있는 배럴(Barrel) 패턴
 * - 모듈 내부 구조 변경 시에도 외부 의존성에 영향을 최소화
 * 
 * 📦 Export 구조:
 * - 핵심 모듈: LogStreamingModule
 * - 서비스: LogStreamingService  
 * - 타입 정의: 인터페이스 및 타입들
 * - 유틸리티: 헬퍼 함수들 (필요시)
 */

// 🏗 핵심 모듈
export { LogStreamingModule } from './log-streaming.module';

// 🔧 서비스 클래스들
export { LogStreamingService } from './services/log-streaming.service';

// 🌐 컨트롤러 및 게이트웨이
export { LogStreamingController } from './controllers/log-streaming.controller';
export { LogStreamingGateway } from './gateways/log-streaming.gateway';

// 🏷 타입 정의
export type {
  SSEMessage,
  LogStreamSession,
  LogFilter,
  PipelineStatus,
  StreamingChannel,
  LogStreamingConfig,
  StreamingMetrics,
} from './types/log-streaming.types';

// 🔌 인터페이스
export type {
  ILogStreamingService,
  ILogStreamingController,
  ILogStreamingGateway,
} from './interfaces/log-streaming.interface';

/**
 * 📝 사용 예시:
 * 
 * ```typescript
 * // 다른 모듈에서 사용할 때
 * import { 
 *   LogStreamingModule, 
 *   LogStreamingService,
 *   LogFilter 
 * } from '../log-streaming';
 * 
 * // 또는 개별 import
 * import { LogStreamingService } from '../log-streaming/services/log-streaming.service';
 * ```
 */