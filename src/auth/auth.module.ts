import { Global, Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { JwtService } from './services';
@Global()
@Module({
  imports: [],
  exports: [JwtService],
  providers: [AuthService, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
