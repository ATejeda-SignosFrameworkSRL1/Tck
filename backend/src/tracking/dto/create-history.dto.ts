import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateHistoryDto {
  @IsNumber()
  @IsNotEmpty()
  ticketId: number;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  fieldChanged: string;

  @IsString()
  @IsOptional()
  oldValue?: string;

  @IsString()
  @IsOptional()
  newValue?: string;
}
