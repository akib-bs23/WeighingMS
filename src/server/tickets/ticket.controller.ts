import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type { TicketState } from '../../shared/contracts/ticket';
import { TicketService } from './ticket.service';

/** WeighingMS ticket composition and printing (Screen 3, workbook Step 27). */
@Controller('sessions/:sessionId/ticket')
export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  @Get()
  get(@Param('sessionId') sessionId: string): TicketState {
    return this.tickets.get(sessionId);
  }

  @Post()
  @HttpCode(200)
  submit(@Param('sessionId') sessionId: string): Promise<TicketState> {
    return this.tickets.submit(sessionId);
  }

  @Post('retry')
  @HttpCode(200)
  retry(@Param('sessionId') sessionId: string): Promise<TicketState> {
    return this.tickets.retry(sessionId);
  }

  @Post('reprint')
  @HttpCode(200)
  reprint(@Param('sessionId') sessionId: string): Promise<TicketState> {
    return this.tickets.reprint(sessionId);
  }
}
