import { Module } from '@nestjs/common';
import { GithubController } from './controllers/github.controller';
import { GithubService } from './services/github.service';
import { PrismaModule } from '@database/database.module';

/**
 * GitHub 통합 모듈
 * - GitHub App 연동 기능 제공
 * - 레포지토리 및 브랜치 관리
 * - 프로젝트와 GitHub 리소스 연결
 */
@Module({
    imports: [PrismaModule],
    controllers: [GithubController],
    providers: [GithubService],
    exports: [GithubService],
})
export class GithubModule { }
