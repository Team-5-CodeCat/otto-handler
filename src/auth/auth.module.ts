import { Global, Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { JwtService } from './services';
import { GithubOauthService } from './services/github-oauth.service';

@Global()
@Module({
  exports: [JwtService],
  providers: [AuthService, JwtService, GithubOauthService],
  controllers: [AuthController],
})
export class AuthModule {}
