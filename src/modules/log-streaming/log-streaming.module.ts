import { Module } from '@nestjs/common';

import { LogStreamingService } from './services/log-streaming.service';
import { LogStreamingController } from './controllers/log-streaming.controller';
// import { LogStreamingGateway } from './gateways/log-streaming.gateway';
import { OttoscalerModule } from '../../integrations/grpc';

/**
 * 🔄 LogStreamingModule
 *
 * 📋 목적:
 * - 실시간 로그 스트리밍을 위한 통합 모듈
 * - gRPC 로그 수신 → SSE/WebSocket으로 클라이언트 전달
 * - CI/CD 파이프라인 실행 로그의 실시간 모니터링 제공
 *
 * 🏗 아키텍처:
 * 1. gRPC Client (Ottoscaler) → LogStreamingService → 로그 수집/처리
 * 2. HTTP SSE (LogStreamingController) → 웹 브라우저 실시간 스트림
 * 3. WebSocket (LogStreamingGateway) → 양방향 실시간 통신
 *
 * 🔗 의존성:
 * - OttoscalerModule: gRPC 클라이언트를 통한 로그 수신
 * - PrismaModule: 로그 메타데이터 DB 저장 (글로벌 모듈이므로 자동 import)
 *
 * 💡 비즈니스 로직:
 * - Worker Pod 로그 → 개발자가 실시간으로 빌드/테스트/배포 상황 확인
 * - 파이프라인 실행 중 발생하는 모든 로그를 통합 관리
 * - 로그 필터링, 검색, 히스토리 관리
 */
@Module({
  imports: [
    // gRPC 통신을 위한 Ottoscaler 모듈
    // 📡 기술적 구현: gRPC 클라이언트를 통해 Worker Pod 로그 수신
    OttoscalerModule,
  ],
  providers: [
    // 핵심 로그 처리 서비스
    // 🔧 기술적 구현: gRPC 스트림 → RxJS Observable 변환 → 클라이언트 분배
    LogStreamingService,

    // WebSocket 게이트웨이 (양방향 실시간 통신)
    // 🔧 기술적 구현: Socket.IO를 통한 실시간 로그 스트리밍
    // LogStreamingGateway,
  ],
  controllers: [
    // HTTP SSE 컨트롤러 (Server-Sent Events)
    // 🔧 기술적 구현: HTTP 스트리밍을 통한 단방향 로그 전송
    LogStreamingController,
  ],
  exports: [
    // 다른 모듈에서 로그 스트리밍 기능을 사용할 수 있도록 노출
    // 💼 비즈니스 가치: Pipeline 모듈 등에서 로그 스트리밍 기능 활용
    LogStreamingService,
  ],
})
export class LogStreamingModule {}
