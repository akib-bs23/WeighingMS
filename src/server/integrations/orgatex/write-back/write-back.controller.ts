import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { WriteBackState } from '../../../../shared/contracts/write-back';
import { WriteBackService } from './write-back.service';

/** Station access to a session's OrgaTEX write-back status ("Written to OrgaTEX") and Retry. */
@Controller('sessions/:sessionId/write-back')
export class WriteBackController {
  constructor(private readonly writeBack: WriteBackService) {}

  @Get()
  get(@Param('sessionId') sessionId: string): WriteBackState {
    return this.writeBack.get(sessionId);
  }

  @Post('retry')
  @HttpCode(200)
  retry(@Param('sessionId') sessionId: string): Promise<WriteBackState> {
    return this.writeBack.retry(sessionId);
  }
}
