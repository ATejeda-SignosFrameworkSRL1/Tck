import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { TicketHistory } from './ticket-history.entity';
import { TimeTracking } from './time-tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketHistory, TimeTracking])],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
