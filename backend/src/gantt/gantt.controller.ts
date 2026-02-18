import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { GanttService } from './gantt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('gantt')
@UseGuards(JwtAuthGuard)
export class GanttController {
  constructor(private readonly ganttService: GanttService) {}

  @Get('project/:projectId')
  getGanttData(@Param('projectId') projectId: string) {
    return this.ganttService.getGanttData(+projectId);
  }

  @Get('project/:projectId/critical-path')
  getCriticalPath(@Param('projectId') projectId: string) {
    return this.ganttService.getCriticalPath(+projectId);
  }

  @Get('project/:projectId/deviations')
  getDeviations(@Param('projectId') projectId: string) {
    return this.ganttService.getDeviations(+projectId);
  }
}
