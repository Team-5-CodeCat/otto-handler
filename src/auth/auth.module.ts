import { Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { JwtService } from './services';

@Module({
  imports: [],
  exports: [JwtService],
  providers: [AuthService, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
