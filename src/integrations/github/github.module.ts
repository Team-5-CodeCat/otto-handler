import { Module } from '@nestjs/common';
import { GithubController } from './controllers/github.controller';
import { GithubService } from './services/github.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '../../auth/services/jwt.service';

@Module({
  controllers: [GithubController],
  providers: [GithubService, PrismaService, JwtService],
})
export class GithubModule {}
