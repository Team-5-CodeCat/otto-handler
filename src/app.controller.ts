import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { ExtendedFastifyReply } from './types/type';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
}
