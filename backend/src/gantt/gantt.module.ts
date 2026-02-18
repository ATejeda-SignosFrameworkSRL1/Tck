import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GanttService } from './gantt.service';
import { GanttController } from './gantt.controller';
import { MatrixItem } from '../matrix/entities/matrix-item.entity';
import { MatrixDependency } from '../matrix/entities/matrix-dependency.entity';
import { Ticket } from '../tickets/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatrixItem, MatrixDependency, Ticket]),
  ],
  controllers: [GanttController],
  providers: [GanttService],
  exports: [GanttService],
})
export class GanttModule {}
