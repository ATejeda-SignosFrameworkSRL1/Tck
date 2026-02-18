import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('project/:projectId/health')
  getProjectHealth(@Param('projectId') projectId: string) {
    return this.metricsService.getProjectHealth(+projectId);
  }

  @Get('project/:projectId/progress')
  getProgressMetrics(@Param('projectId') projectId: string) {
    return this.metricsService.getProgressMetrics(+projectId);
  }

  @Get('project/:projectId/deviation')
  getDeviationMetrics(@Param('projectId') projectId: string) {
    return this.metricsService.getDeviationMetrics(+projectId);
  }

  @Get('project/:projectId/forecast')
  getForecast(@Param('projectId') projectId: string) {
    return this.metricsService.getForecast(+projectId);
  }

  @Get('project/:projectId/documentation-compliance')
  getDocumentationCompliance(@Param('projectId') projectId: string) {
    return this.metricsService.getDocumentationCompliance(+projectId);
  }

  @Get('project/:projectId/ticket-distribution')
  getTicketDistribution(@Param('projectId') projectId: string) {
    return this.metricsService.getTicketDistribution(+projectId);
  }
}
