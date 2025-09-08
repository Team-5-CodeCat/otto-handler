import { Global, Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { JwtService } from './services';

@Global()
@Module({
  exports: [JwtService],
  providers: [AuthService, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
