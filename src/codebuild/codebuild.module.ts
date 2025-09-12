import { Module } from '@nestjs/common';
import { CodeBuildService } from './services/codebuild.service';
import { CodeBuildController } from './controllers/codebuild.controller';

@Module({
  controllers: [CodeBuildController],
  providers: [CodeBuildService],
  exports: [CodeBuildService],
})
export class CodeBuildModule {}
