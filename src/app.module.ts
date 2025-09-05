import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { GithubModule } from './integrations/github/github.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    GithubModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
