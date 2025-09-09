import { Module, forwardRef } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';
import { GithubService } from './services/github.service';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [forwardRef(() => PipelinesModule)],
  exports: [ProjectService, GithubService],
  providers: [ProjectService, GithubService],
  controllers: [ProjectController],
})
export class ProjectsModule {}
