import { IsOptional, IsNumber, IsEnum, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority } from '../ticket.entity';

export class FilterTicketsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  projectId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  currentDepartmentId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  originDepartmentId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  targetDepartmentId?: number;

  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  createdBy?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  assignedTo?: number;

  @IsOptional()
  tagIds?: number[] | number;
}
