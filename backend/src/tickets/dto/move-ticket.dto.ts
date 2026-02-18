import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class MoveTicketDto {
  @IsNumber()
  @IsNotEmpty()
  toDepartmentId: number;

  @IsString()
  @IsOptional()
  note?: string;
}
