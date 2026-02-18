import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MatrixItem } from '../matrix/entities/matrix-item.entity';
import { MatrixAcceptanceCriteria } from '../matrix/entities/matrix-acceptance-criteria.entity';
import { Ticket } from '../tickets/ticket.entity';
import { TicketAttachment } from '../tickets/ticket-attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatrixItem,
      MatrixAcceptanceCriteria,
      Ticket,
      TicketAttachment,
    ]),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
