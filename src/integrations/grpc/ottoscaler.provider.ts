import * as grpc from '@grpc/grpc-js';
import { OttoscalerClients } from './ottoscaler.types';
import {
  LogStreamingServiceClient,
  OttoHandlerLogServiceClient,
  OttoscalerServiceClient,
} from '../../generated/otto';

/**
 * Otto Scaler와 통신하기 위한 gRPC 클라이언트들을 생성하는 팩토리 함수입니다.
 *
 * 이 함수는 Otto Scaler 서비스와 통신하는 데 필요한 모든 gRPC 클라이언트를
 * 초기화하고 반환합니다. 현재는 비보안 연결(insecure)을 사용하지만,
 * 프로덕션 환경에서는 TLS/SSL을 사용한 보안 연결로 변경해야 합니다.
 *
 * @param targetUrl - gRPC 서버의 URL (예: 'localhost:50051' 또는 'ottoscaler.service.local:50051')
 *                    환경 변수 OTTOSCALER_GRPC_URL에서 주입됩니다.
 *
 * @returns OttoscalerClients - 세 개의 gRPC 서비스 클라이언트를 포함하는 객체
 *   - ottoscalerService: 워커 인스턴스 스케일링 및 파이프라인 실행 관리
 *   - ottoHandlerLogService: Worker에서 Handler로 로그 포워딩
 *   - logStreamingService: 실시간 로그 스트리밍
 *
 * @example
 * const clients = createOttoscalerGrpcClients('localhost:50051');
 * // clients.ottoscalerService를 사용하여 스케일링 작업 수행
 * // clients.logStreamingService를 사용하여 로그 스트리밍
 *
 * @note
 * - 현재는 createInsecure()를 사용하여 비보안 연결을 생성합니다.
 * - 프로덕션 환경에서는 grpc.credentials.createSsl()을 사용하여
 *   보안 연결을 설정해야 합니다.
 * - 모든 클라이언트는 동일한 서버 URL과 자격 증명을 공유합니다.
 */
export function createOttoscalerGrpcClients(
  targetUrl: string,
): OttoscalerClients {
  // gRPC 채널 자격 증명 생성
  // TODO: 프로덕션 환경에서는 createSsl()로 변경 필요
  const channelCredentials = grpc.credentials.createInsecure();

  // 각 서비스에 대한 gRPC 클라이언트 인스턴스 생성
  const clients: OttoscalerClients = {
    // Otto Scaler 메인 서비스 클라이언트
    // 워커 스케일링, 상태 조회, 파이프라인 실행 담당
    ottoscalerService: new OttoscalerServiceClient(
      targetUrl,
      channelCredentials,
    ),

    // Worker → Handler 로그 포워딩 서비스 클라이언트
    // Worker에서 생성된 로그를 Handler로 전송하는 양방향 스트리밍
    ottoHandlerLogService: new OttoHandlerLogServiceClient(
      targetUrl,
      channelCredentials,
    ),

    // 일반 로그 스트리밍 서비스 클라이언트
    // 파이프라인 실행 중 발생하는 모든 로그의 실시간 스트리밍
    logStreamingService: new LogStreamingServiceClient(
      targetUrl,
      channelCredentials,
    ),
  };

  return clients;
}
