import { Module } from '@nestjs/common';
import { PipelineController } from './controllers';
import { PipelineService } from './services';

@Module({
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
