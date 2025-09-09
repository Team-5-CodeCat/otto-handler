import { Module } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';
import { GithubService } from './services/github.service';
import { PipelinesModule } from '../pipelines/pipelines.module';

@Module({
  imports: [PipelinesModule],
  exports: [ProjectService, GithubService],
  providers: [ProjectService, GithubService],
  controllers: [ProjectController],
})
export class ProjectsModule {}
