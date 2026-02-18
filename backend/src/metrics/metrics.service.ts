import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrixItem, MatrixItemStatus } from '../matrix/entities/matrix-item.entity';
import { MatrixAcceptanceCriteria } from '../matrix/entities/matrix-acceptance-criteria.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { TicketAttachment } from '../tickets/ticket-attachment.entity';

export interface HealthSemaphore {
  status: 'green' | 'yellow' | 'red';
  deviationPercentage: number;
  message: string;
}

export interface ProgressMetrics {
  planned: number;       // % que debería estar completado a la fecha
  actual: number;        // % real completado
  gap: number;           // Diferencia
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  delayedItems: number;
  byPartida: Array<{
    id: number;
    code: string;
    title: string;
    planned: number;
    actual: number;
    status: string;
    ticketCount: number;
    ticketsClosed: number;
  }>;
}

export interface DeviationMetrics {
  sCurve: Array<{
    date: string;
    planned: number;
    actual: number;
  }>;
  gapDays: number;
  projectedEndDate: string | null;
  plannedEndDate: string | null;
}

export interface ForecastMetrics {
  velocity: number;          // Tickets cerrados por semana
  remainingTickets: number;
  projectedEndDate: string | null;
  plannedEndDate: string | null;
  gapDays: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DocumentationCompliance {
  totalItems: number;
  documentedItems: number;
  percentage: number;
  byItem: Array<{
    id: number;
    code: string;
    title: string;
    hasDocumentation: boolean;
    attachmentCount: number;
    criteriaTotal: number;
    criteriaMet: number;
  }>;
}

export interface TicketDistribution {
  open: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  done: number;
  total: number;
  overdueCount: number;
}

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MatrixItem)
    private matrixItemsRepository: Repository<MatrixItem>,
    @InjectRepository(MatrixAcceptanceCriteria)
    private criteriaRepository: Repository<MatrixAcceptanceCriteria>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketAttachment)
    private attachmentsRepository: Repository<TicketAttachment>,
  ) {}

  // ==================== SEMÁFORO DE SALUD ====================

  async getProjectHealth(projectId: number): Promise<HealthSemaphore> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
    });

    if (items.length === 0) {
      return { status: 'green', deviationPercentage: 0, message: 'Sin ítems en la matriz' };
    }

    const now = new Date();
    let totalDeviation = 0;
    let itemsWithDates = 0;

    for (const item of items) {
      if (!item.plannedEnd) continue;
      itemsWithDates++;

      const plannedDuration = item.plannedStart
        ? item.plannedEnd.getTime() - item.plannedStart.getTime()
        : 30 * 24 * 60 * 60 * 1000; // default 30 días

      const elapsedSincePlannedEnd = now.getTime() - item.plannedEnd.getTime();

      if (item.status !== MatrixItemStatus.COMPLETED && elapsedSincePlannedEnd > 0) {
        const deviationRatio = elapsedSincePlannedEnd / Math.max(plannedDuration, 1);
        totalDeviation += deviationRatio;
      }
    }

    const avgDeviation = itemsWithDates > 0 ? (totalDeviation / itemsWithDates) * 100 : 0;

    let status: 'green' | 'yellow' | 'red';
    let message: string;

    if (avgDeviation < 5) {
      status = 'green';
      message = 'Proyecto en plan. Todo fluye según la línea base.';
    } else if (avgDeviation < 15) {
      status = 'yellow';
      message = 'Precaución. Hay tickets bloqueados o retrasos en tareas.';
    } else {
      status = 'red';
      message = 'Crítico. La ruta crítica está afectada. Requiere intervención inmediata.';
    }

    return {
      status,
      deviationPercentage: Math.round(avgDeviation * 100) / 100,
      message,
    };
  }

  // ==================== AVANCE REAL VS PLANIFICADO ====================

  async getProgressMetrics(projectId: number): Promise<ProgressMetrics> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
      order: { code: 'ASC' },
    });

    const now = new Date();
    let totalPlanned = 0;
    let totalActual = 0;
    let weightSum = 0;

    const byPartida: ProgressMetrics['byPartida'] = [];

    for (const item of items) {
      const tickets = await this.ticketsRepository.find({
        where: { matrixItemId: item.id },
      });

      const ticketCount = tickets.length;
      const ticketsClosed = tickets.filter((t) => t.status === TicketStatus.DONE).length;
      const actual = ticketCount > 0 ? (ticketsClosed / ticketCount) * 100 : 0;

      // Calcular % planificado a la fecha
      let planned = 0;
      if (item.plannedStart && item.plannedEnd) {
        const totalDuration = item.plannedEnd.getTime() - item.plannedStart.getTime();
        const elapsed = now.getTime() - item.plannedStart.getTime();
        planned = Math.min(100, Math.max(0, (elapsed / Math.max(totalDuration, 1)) * 100));
      }

      const weight = Number(item.weight) || 1;
      weightSum += weight;
      totalPlanned += planned * weight;
      totalActual += actual * weight;

      byPartida.push({
        id: item.id,
        code: item.code,
        title: item.title,
        planned: Math.round(planned * 100) / 100,
        actual: Math.round(actual * 100) / 100,
        status: item.status,
        ticketCount,
        ticketsClosed,
      });
    }

    const overallPlanned = weightSum > 0 ? totalPlanned / weightSum : 0;
    const overallActual = weightSum > 0 ? totalActual / weightSum : 0;

    return {
      planned: Math.round(overallPlanned * 100) / 100,
      actual: Math.round(overallActual * 100) / 100,
      gap: Math.round((overallActual - overallPlanned) * 100) / 100,
      totalItems: items.length,
      completedItems: items.filter((i) => i.status === MatrixItemStatus.COMPLETED).length,
      inProgressItems: items.filter((i) => i.status === MatrixItemStatus.IN_PROGRESS).length,
      delayedItems: items.filter((i) => i.status === MatrixItemStatus.DELAYED).length,
      byPartida,
    };
  }

  // ==================== CURVA S Y DESVÍO ====================

  async getDeviationMetrics(projectId: number): Promise<DeviationMetrics> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
    });

    const tickets = await this.ticketsRepository.find({
      where: { projectId },
      order: { updatedAt: 'ASC' },
    });

    // Determinar rango de fechas del proyecto
    const allDates = items
      .flatMap((i) => [i.plannedStart, i.plannedEnd].filter(Boolean)) as Date[];
    if (allDates.length === 0) {
      return { sCurve: [], gapDays: 0, projectedEndDate: null, plannedEndDate: null };
    }

    const projectStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const projectEnd = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const now = new Date();
    const endPoint = now > projectEnd ? now : projectEnd;

    // Generar puntos de la Curva S (semanal)
    const sCurve: DeviationMetrics['sCurve'] = [];
    const totalTickets = tickets.length;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const totalDuration = projectEnd.getTime() - projectStart.getTime();

    for (let d = projectStart.getTime(); d <= endPoint.getTime(); d += weekMs) {
      const currentDate = new Date(d);
      const dateStr = currentDate.toISOString().split('T')[0];

      // % planificado: proporción lineal del tiempo transcurrido
      const elapsed = currentDate.getTime() - projectStart.getTime();
      const planned = Math.min(100, (elapsed / Math.max(totalDuration, 1)) * 100);

      // % actual: tickets cerrados hasta esta fecha
      const closedByDate = tickets.filter(
        (t) => t.status === TicketStatus.DONE && new Date(t.updatedAt) <= currentDate,
      ).length;
      const actual = totalTickets > 0 ? (closedByDate / totalTickets) * 100 : 0;

      sCurve.push({
        date: dateStr,
        planned: Math.round(planned * 100) / 100,
        actual: Math.round(actual * 100) / 100,
      });
    }

    // Calcular fecha proyectada de fin
    const closedTickets = tickets.filter((t) => t.status === TicketStatus.DONE).length;
    const remainingTickets = totalTickets - closedTickets;
    let projectedEndDate: string | null = null;
    let gapDays = 0;

    if (closedTickets > 0 && remainingTickets > 0) {
      const firstClosed = tickets.find((t) => t.status === TicketStatus.DONE);
      if (firstClosed) {
        const daysActive = Math.max(
          1,
          Math.ceil(
            (now.getTime() - new Date(firstClosed.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        const velocity = closedTickets / daysActive;
        const daysRemaining = velocity > 0 ? Math.ceil(remainingTickets / velocity) : 365;
        const projected = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
        projectedEndDate = projected.toISOString();
        gapDays = Math.ceil(
          (projected.getTime() - projectEnd.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    } else if (remainingTickets === 0) {
      projectedEndDate = now.toISOString();
      gapDays = 0;
    }

    return {
      sCurve,
      gapDays,
      projectedEndDate,
      plannedEndDate: projectEnd.toISOString(),
    };
  }

  // ==================== FORECASTING ====================

  async getForecast(projectId: number): Promise<ForecastMetrics> {
    const tickets = await this.ticketsRepository.find({
      where: { projectId },
      order: { updatedAt: 'ASC' },
    });

    const items = await this.matrixItemsRepository.find({
      where: { projectId },
    });

    const allDates = items
      .flatMap((i) => [i.plannedEnd].filter(Boolean)) as Date[];
    const plannedEndDate = allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime()))).toISOString()
      : null;

    const totalTickets = tickets.length;
    const closedTickets = tickets.filter((t) => t.status === TicketStatus.DONE).length;
    const remainingTickets = totalTickets - closedTickets;

    // Calcular velocidad (tickets cerrados por semana en los últimos 4 semanas)
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentlyClosed = tickets.filter(
      (t) =>
        t.status === TicketStatus.DONE &&
        new Date(t.updatedAt) >= fourWeeksAgo,
    ).length;
    const velocity = recentlyClosed / 4; // per week

    let projectedEndDate: string | null = null;
    let gapDays = 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (velocity > 0 && remainingTickets > 0) {
      const weeksRemaining = remainingTickets / velocity;
      const projected = new Date(now.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
      projectedEndDate = projected.toISOString();

      if (plannedEndDate) {
        gapDays = Math.ceil(
          (projected.getTime() - new Date(plannedEndDate).getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      // Confidence level
      if (closedTickets >= totalTickets * 0.5) {
        confidence = 'high';
      } else if (closedTickets >= totalTickets * 0.25) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
    } else if (remainingTickets === 0) {
      projectedEndDate = now.toISOString();
      confidence = 'high';
    }

    return {
      velocity: Math.round(velocity * 100) / 100,
      remainingTickets,
      projectedEndDate,
      plannedEndDate,
      gapDays,
      confidence,
    };
  }

  // ==================== COMPLIANCE DOCUMENTAL ====================

  async getDocumentationCompliance(projectId: number): Promise<DocumentationCompliance> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
      relations: ['acceptanceCriteria'],
      order: { code: 'ASC' },
    });

    const byItem: DocumentationCompliance['byItem'] = [];
    let documentedCount = 0;

    for (const item of items) {
      // Contar adjuntos de tickets vinculados
      const tickets = await this.ticketsRepository.find({
        where: { matrixItemId: item.id },
        select: ['id'],
      });

      let attachmentCount = 0;
      for (const ticket of tickets) {
        const count = await this.attachmentsRepository.count({
          where: { ticketId: ticket.id },
        });
        attachmentCount += count;
      }

      const criteriaTotal = item.acceptanceCriteria?.length || 0;
      const criteriaMet = item.acceptanceCriteria?.filter((c) => c.isMet).length || 0;

      const hasDocumentation = attachmentCount > 0 && (criteriaTotal === 0 || criteriaMet > 0);
      if (hasDocumentation) documentedCount++;

      byItem.push({
        id: item.id,
        code: item.code,
        title: item.title,
        hasDocumentation,
        attachmentCount,
        criteriaTotal,
        criteriaMet,
      });
    }

    return {
      totalItems: items.length,
      documentedItems: documentedCount,
      percentage: items.length > 0
        ? Math.round((documentedCount / items.length) * 10000) / 100
        : 0,
      byItem,
    };
  }

  // ==================== DISTRIBUCIÓN DE TICKETS ====================

  async getTicketDistribution(projectId: number): Promise<TicketDistribution> {
    const tickets = await this.ticketsRepository.find({
      where: { projectId },
    });

    const now = new Date();
    const distribution: TicketDistribution = {
      open: 0,
      inProgress: 0,
      blocked: 0,
      inReview: 0,
      done: 0,
      total: tickets.length,
      overdueCount: 0,
    };

    for (const ticket of tickets) {
      switch (ticket.status) {
        case TicketStatus.OPEN:
          distribution.open++;
          break;
        case TicketStatus.IN_PROGRESS:
          distribution.inProgress++;
          break;
        case TicketStatus.BLOCKED:
          distribution.blocked++;
          break;
        case TicketStatus.IN_REVIEW:
          distribution.inReview++;
          break;
        case TicketStatus.DONE:
          distribution.done++;
          break;
      }

      if (ticket.dueDate && new Date(ticket.dueDate) < now && ticket.status !== TicketStatus.DONE) {
        distribution.overdueCount++;
      }
    }

    return distribution;
  }
}
