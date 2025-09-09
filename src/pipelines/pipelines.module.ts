import { Module } from '@nestjs/common';
import { PipelineController } from './controllers/pipeline.controller';
import { PipelineService } from './services/pipeline.service';
import { PrismaModule } from '../database/database.module';
import { OttoscalerModule } from '../integrations/grpc/ottoscaler.module';

@Module({
  imports: [PrismaModule, OttoscalerModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelinesModule {}
