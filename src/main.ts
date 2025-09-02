import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
    }),
  );
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'dev-cookie-secret',
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
