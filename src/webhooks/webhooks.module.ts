import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { ProjectsModule } from '../projects/projects.module';

export * from './dtos';

@Module({
  imports: [ProjectsModule],
  controllers: [WebhookController],
})
export class WebhooksModule {}
