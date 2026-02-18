import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { CreateTimeTrackingDto } from './dto/create-time-tracking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tickets/:ticketId')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  // Historial
  @Get('history')
  getHistory(@Param('ticketId') ticketId: string) {
    return this.trackingService.getTicketHistory(+ticketId);
  }

  // Time tracking
  @Post('time')
  logTime(
    @Param('ticketId') ticketId: string,
    @Body() createTimeTrackingDto: CreateTimeTrackingDto,
    @Request() req,
  ) {
    return this.trackingService.logTime(+ticketId, createTimeTrackingDto, req.user.userId);
  }

  @Get('time')
  getTime(@Param('ticketId') ticketId: string) {
    return this.trackingService.getTicketTime(+ticketId);
  }

  @Get('time/total')
  getTotalTime(@Param('ticketId') ticketId: string) {
    return this.trackingService.getTotalTime(+ticketId);
  }
}
