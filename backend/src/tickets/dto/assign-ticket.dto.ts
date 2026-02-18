import { IsArray, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTicketDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  assigneeIds: number[];

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  @Type(() => Number)
  observerIds?: number[];

  // Responsable de seguimiento (uno solo por ticket)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  responsibleId?: number;
}
