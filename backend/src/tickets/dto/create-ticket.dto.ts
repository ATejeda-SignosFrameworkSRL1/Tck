import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketPriority, TicketType } from '../ticket.entity';
import { CreateChecklistItemDto } from './create-checklist-item.dto';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  // Tipo de ticket SIPE
  @IsEnum(TicketType)
  @IsOptional()
  ticketType?: TicketType;

  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  // Vínculo a la Matriz de Entregables (obligatorio en flujo SIPE)
  @IsNumber()
  @IsOptional()
  matrixItemId?: number;

  // Horas estimadas para proyecciones
  @IsNumber()
  @IsOptional()
  estimatedHours?: number;

  // Departamento de origen (donde se crea el ticket)
  @IsNumber()
  @IsNotEmpty()
  originDepartmentId: number;

  // Departamento destino (para quien va etiquetado, opcional)
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

  // Items de checklist al crear
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  checklistItems?: CreateChecklistItemDto[];
}
