import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TicketStatus, TicketPriority, TicketType } from '../ticket.entity';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  // Tipo de ticket SIPE
  @IsEnum(TicketType)
  @IsOptional()
  ticketType?: TicketType;

  // Vínculo a la Matriz de Entregables
  @IsNumber()
  @IsOptional()
  matrixItemId?: number;

  // Horas estimadas para proyecciones
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  // Departamento destino (para quien va etiquetado)
  @IsNumber()
  @IsOptional()
  targetDepartmentId?: number;

  // Usuarios asignados al ticket (responsables)
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  assignedUserIds?: number[];

  // Usuarios en observación
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  observerIds?: number[];

  // Responsable de seguimiento (uno solo por ticket)
  @IsNumber()
  @IsOptional()
  responsibleId?: number;

  // Fecha de inicio
  @IsDateString()
  @IsOptional()
  startDate?: string;

  // Fecha de compromiso/entrega
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
