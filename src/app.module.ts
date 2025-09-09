import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { ProjectsModule } from './projects/projects.module';
import { OttoscalerModule } from './integrations/grpc/ottoscaler.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PipelinesModule } from './pipelines/pipelines.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev',
    }),
    ProjectsModule,
    OttoscalerModule,
    WebhooksModule,
    PipelinesModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
