import { Module } from '@nestjs/common';
import { PipelineController } from './controllers';
import { PipelineService, BuildSpecConverterService } from './services';

@Module({
  controllers: [PipelineController],
  providers: [PipelineService, BuildSpecConverterService],
  exports: [PipelineService, BuildSpecConverterService],
})
export class PipelineModule {}
