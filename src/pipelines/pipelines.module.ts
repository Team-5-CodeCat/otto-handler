import { Module } from '@nestjs/common';
import { PipelineController } from './controllers/pipeline.controller';
import { PipelineService } from './services/pipeline.service';
import { PrismaModule } from '../database/database.module';

@Module({
  imports: [PrismaModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelinesModule {}
