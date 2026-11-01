import { Module } from '@nestjs/common';
import { PrinterModule } from '../integrations/printer/printer.module';
import { WeighingModule } from '../weighing/weighing.module';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [PrinterModule, WeighingModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketsModule {}
