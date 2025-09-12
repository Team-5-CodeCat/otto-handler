import { Module } from '@nestjs/common';
import { ProjectService } from './services/project.service';
import { ProjectController } from './controllers/project.controller';
import { GithubService } from './services/github.service';

@Module({
  exports: [ProjectService, GithubService],
  providers: [ProjectService, GithubService],
  controllers: [ProjectController],
})
export class ProjectsModule {}
