import { Global, Module } from '@nestjs/common';
import { AuthService } from './services';
import { AuthController } from './controllers';
import { JwtService } from './services';
import { ProjectsModule } from '../projects/projects.module';
@Global()
@Module({
  imports: [ProjectsModule],
  exports: [JwtService],
  providers: [AuthService, JwtService],
  controllers: [AuthController],
})
export class AuthModule {}
