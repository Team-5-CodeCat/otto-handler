import * as grpc from '@grpc/grpc-js';
import { OttoscalerClients } from './ottoscaler.types';
import {
  LogStreamingServiceClient,
  OttoHandlerLogServiceClient,
  OttoscalerServiceClient,
} from '../../generated/otto';

export function createOttoscalerGrpcClients(
  targetUrl: string,
): OttoscalerClients {
  const channelCredentials = grpc.credentials.createInsecure();
  const clients: OttoscalerClients = {
    ottoscalerService: new OttoscalerServiceClient(
      targetUrl,
      channelCredentials,
    ),
    ottoHandlerLogService: new OttoHandlerLogServiceClient(
      targetUrl,
      channelCredentials,
    ),
    logStreamingService: new LogStreamingServiceClient(
      targetUrl,
      channelCredentials,
    ),
  };
  return clients;
}
