import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatrixItem, MatrixItemStatus } from '../matrix/entities/matrix-item.entity';
import { MatrixDependency, DependencyType } from '../matrix/entities/matrix-dependency.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';

export interface GanttTask {
  id: number;
  code: string;
  title: string;
  parentId: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  progress: number;
  isMilestone: boolean;
  isCriticalPath: boolean;
  status: string;
  weight: number;
  ticketCount: number;
  ticketsClosed: number;
}

export interface GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
  lagDays: number;
}

export interface GanttData {
  tasks: GanttTask[];
  links: GanttLink[];
  criticalPath: number[];
  projectStart: string | null;
  projectEnd: string | null;
}

export interface DeviationReport {
  itemId: number;
  code: string;
  title: string;
  plannedEnd: string | null;
  projectedEnd: string | null;
  deviationDays: number;
  status: string;
  isCriticalPath: boolean;
  blockedTickets: number;
}

@Injectable()
export class GanttService {
  constructor(
    @InjectRepository(MatrixItem)
    private matrixItemsRepository: Repository<MatrixItem>,
    @InjectRepository(MatrixDependency)
    private dependenciesRepository: Repository<MatrixDependency>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async getGanttData(projectId: number): Promise<GanttData> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    const dependencies = await this.dependenciesRepository
      .createQueryBuilder('dep')
      .innerJoin('dep.predecessor', 'pred')
      .where('pred.projectId = :projectId', { projectId })
      .getMany();

    // Obtener conteo de tickets por item
    const ticketCounts = await this.ticketsRepository
      .createQueryBuilder('t')
      .select('t.matrix_item_id', 'matrixItemId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN t.status = :done THEN 1 ELSE 0 END)', 'closed')
      .where('t.project_id = :projectId', { projectId })
      .andWhere('t.matrix_item_id IS NOT NULL')
      .setParameter('done', TicketStatus.DONE)
      .groupBy('t.matrix_item_id')
      .getRawMany();

    const countMap = new Map<number, { total: number; closed: number }>();
    for (const row of ticketCounts) {
      countMap.set(Number(row.matrixItemId), {
        total: Number(row.total),
        closed: Number(row.closed),
      });
    }

    const tasks: GanttTask[] = items.map((item) => {
      const counts = countMap.get(item.id) || { total: 0, closed: 0 };
      return {
        id: item.id,
        code: item.code,
        title: item.title,
        parentId: item.parentId,
        plannedStart: item.plannedStart?.toISOString() || null,
        plannedEnd: item.plannedEnd?.toISOString() || null,
        actualStart: item.actualStart?.toISOString() || null,
        actualEnd: item.actualEnd?.toISOString() || null,
        baselineStart: item.baselineStart?.toISOString() || null,
        baselineEnd: item.baselineEnd?.toISOString() || null,
        progress: Number(item.progressPercentage),
        isMilestone: item.isMilestone,
        isCriticalPath: item.isCriticalPath,
        status: item.status,
        weight: Number(item.weight),
        ticketCount: counts.total,
        ticketsClosed: counts.closed,
      };
    });

    const links: GanttLink[] = dependencies.map((dep) => ({
      id: dep.id,
      source: dep.predecessorId,
      target: dep.successorId,
      type: dep.type,
      lagDays: dep.lagDays,
    }));

    // Calcular ruta crítica (simplified forward/backward pass)
    const criticalPath = this.calculateCriticalPath(items, dependencies);

    // Fechas del proyecto
    const dates = items
      .filter((i) => i.plannedStart || i.plannedEnd)
      .flatMap((i) => [i.plannedStart, i.plannedEnd].filter(Boolean)) as Date[];
    const projectStart = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString() : null;
    const projectEnd = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString() : null;

    return { tasks, links, criticalPath, projectStart, projectEnd };
  }

  async getCriticalPath(projectId: number): Promise<number[]> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
    });
    const dependencies = await this.dependenciesRepository
      .createQueryBuilder('dep')
      .innerJoin('dep.predecessor', 'pred')
      .where('pred.projectId = :projectId', { projectId })
      .getMany();

    return this.calculateCriticalPath(items, dependencies);
  }

  async getDeviations(projectId: number): Promise<DeviationReport[]> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
      order: { code: 'ASC' },
    });

    const now = new Date();
    const deviations: DeviationReport[] = [];

    for (const item of items) {
      if (!item.plannedEnd) continue;

      const tickets = await this.ticketsRepository.find({
        where: { matrixItemId: item.id },
      });

      const totalTickets = tickets.length;
      const closedTickets = tickets.filter((t) => t.status === TicketStatus.DONE).length;
      const blockedTickets = tickets.filter((t) => t.status === TicketStatus.BLOCKED).length;

      if (totalTickets === 0) continue;

      // Calcular fecha proyectada basada en velocidad
      let projectedEnd: Date | null = null;
      let deviationDays = 0;

      if (closedTickets === totalTickets) {
        // Ya completado
        projectedEnd = item.actualEnd || now;
        deviationDays = item.actualEnd
          ? Math.ceil((item.actualEnd.getTime() - item.plannedEnd.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      } else {
        // Calcular velocidad (tickets cerrados por día desde inicio)
        const startDate = item.actualStart || item.plannedStart || item.createdAt;
        const daysElapsed = Math.max(1, Math.ceil(
          (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ));
        const velocity = closedTickets / daysElapsed; // tickets por día

        if (velocity > 0) {
          const remainingTickets = totalTickets - closedTickets;
          const daysRemaining = Math.ceil(remainingTickets / velocity);
          projectedEnd = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
        } else {
          // Sin velocidad, proyectar al infinito (usar +365 días)
          projectedEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        }

        deviationDays = Math.ceil(
          (projectedEnd.getTime() - item.plannedEnd.getTime()) / (1000 * 60 * 60 * 24),
        );
      }

      if (deviationDays !== 0 || blockedTickets > 0) {
        deviations.push({
          itemId: item.id,
          code: item.code,
          title: item.title,
          plannedEnd: item.plannedEnd.toISOString(),
          projectedEnd: projectedEnd?.toISOString() || null,
          deviationDays,
          status: item.status,
          isCriticalPath: item.isCriticalPath,
          blockedTickets,
        });
      }
    }

    // Ordenar por desvío descendente
    return deviations.sort((a, b) => b.deviationDays - a.deviationDays);
  }

  // ==================== CRITICAL PATH CALCULATION ====================

  private calculateCriticalPath(
    items: MatrixItem[],
    dependencies: MatrixDependency[],
  ): number[] {
    if (items.length === 0) return [];

    // Simplified CPM: forward pass
    const itemMap = new Map<number, MatrixItem>();
    items.forEach((i) => itemMap.set(i.id, i));

    // Build adjacency (predecessor -> successors)
    const successorMap = new Map<number, number[]>();
    const predecessorMap = new Map<number, number[]>();

    for (const dep of dependencies) {
      if (!successorMap.has(dep.predecessorId)) successorMap.set(dep.predecessorId, []);
      successorMap.get(dep.predecessorId)!.push(dep.successorId);

      if (!predecessorMap.has(dep.successorId)) predecessorMap.set(dep.successorId, []);
      predecessorMap.get(dep.successorId)!.push(dep.predecessorId);
    }

    // Calculate duration in days for each item
    const duration = new Map<number, number>();
    for (const item of items) {
      if (item.plannedStart && item.plannedEnd) {
        const days = Math.max(
          1,
          Math.ceil(
            (item.plannedEnd.getTime() - item.plannedStart.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        duration.set(item.id, days);
      } else {
        duration.set(item.id, 1);
      }
    }

    // Forward pass: Earliest Start (ES) and Earliest Finish (EF)
    const es = new Map<number, number>();
    const ef = new Map<number, number>();

    // Find items with no predecessors (start nodes)
    const startNodes = items.filter(
      (i) => !predecessorMap.has(i.id) || predecessorMap.get(i.id)!.length === 0,
    );

    // Topological sort
    const visited = new Set<number>();
    const sorted: number[] = [];

    const visit = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      const succs = successorMap.get(id) || [];
      // First process all predecessors
      const preds = predecessorMap.get(id) || [];
      for (const pred of preds) {
        visit(pred);
      }
      sorted.push(id);
    };

    for (const item of items) {
      visit(item.id);
    }

    // Forward pass
    for (const id of sorted) {
      const preds = predecessorMap.get(id) || [];
      const maxPredEf = preds.length > 0
        ? Math.max(...preds.map((p) => ef.get(p) || 0))
        : 0;
      es.set(id, maxPredEf);
      ef.set(id, maxPredEf + (duration.get(id) || 1));
    }

    // Project finish time
    const projectFinish = Math.max(...Array.from(ef.values()), 0);

    // Backward pass: Latest Start (LS) and Latest Finish (LF)
    const ls = new Map<number, number>();
    const lf = new Map<number, number>();

    for (const id of [...sorted].reverse()) {
      const succs = successorMap.get(id) || [];
      const minSuccLs = succs.length > 0
        ? Math.min(...succs.map((s) => ls.get(s) || projectFinish))
        : projectFinish;
      lf.set(id, minSuccLs);
      ls.set(id, minSuccLs - (duration.get(id) || 1));
    }

    // Critical path: items where Total Float = LS - ES = 0
    const criticalIds: number[] = [];
    for (const id of sorted) {
      const totalFloat = (ls.get(id) || 0) - (es.get(id) || 0);
      if (Math.abs(totalFloat) < 0.01) {
        criticalIds.push(id);
      }
    }

    return criticalIds;
  }
}
