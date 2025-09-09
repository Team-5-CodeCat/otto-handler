import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OTTOSCALER_GRPC_TOKEN,
  OTTOSCALER_GRPC_URL_ENV,
} from './ottoscaler.constants';
import { createOttoscalerGrpcClients } from './ottoscaler.provider.js';

@Module({
  providers: [
    {
      provide: OTTOSCALER_GRPC_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const targetUrl = config.get<string>(OTTOSCALER_GRPC_URL_ENV);
        if (!targetUrl) {
          throw new Error(
            `Missing environment variable: ${OTTOSCALER_GRPC_URL_ENV}`,
          );
        }
        return createOttoscalerGrpcClients(targetUrl);
      },
    },
  ],
  exports: [OTTOSCALER_GRPC_TOKEN],
})
export class OttoscalerModule {}
