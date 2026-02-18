import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketHistory } from './ticket-history.entity';
import { TimeTracking } from './time-tracking.entity';
import { CreateTimeTrackingDto } from './dto/create-time-tracking.dto';
import { CreateHistoryDto } from './dto/create-history.dto';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TicketHistory)
    private historyRepository: Repository<TicketHistory>,
    @InjectRepository(TimeTracking)
    private timeTrackingRepository: Repository<TimeTracking>,
  ) {}

  // Historial de cambios
  async logChange(createHistoryDto: CreateHistoryDto): Promise<TicketHistory> {
    const history = this.historyRepository.create(createHistoryDto);
    return this.historyRepository.save(history);
  }

  async getTicketHistory(ticketId: number): Promise<TicketHistory[]> {
    return this.historyRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { changedAt: 'DESC' },
    });
  }

  // Time tracking
  async logTime(
    ticketId: number,
    createTimeTrackingDto: CreateTimeTrackingDto,
    userId: number,
  ): Promise<TimeTracking> {
    const timeEntry = this.timeTrackingRepository.create({
      ...createTimeTrackingDto,
      ticketId,
      userId,
    });

    const savedEntry = await this.timeTrackingRepository.save(timeEntry);

    const result = await this.timeTrackingRepository.findOne({
      where: { id: savedEntry.id },
      relations: ['user'],
    });

    if (!result) {
      throw new Error('Error al recuperar la entrada de tiempo guardada');
    }

    return result;
  }

  async getTicketTime(ticketId: number): Promise<TimeTracking[]> {
    return this.timeTrackingRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { loggedAt: 'DESC' },
    });
  }

  async getTotalTime(ticketId: number): Promise<number> {
    const result = await this.timeTrackingRepository
      .createQueryBuilder('time_tracking')
      .select('SUM(time_tracking.hoursSpent)', 'total')
      .where('time_tracking.ticketId = :ticketId', { ticketId })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }
}
