import { IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { DependencyType } from '../entities/matrix-dependency.entity';

export class CreateDependencyDto {
  @IsNumber()
  @IsNotEmpty()
  predecessorId: number;

  @IsNumber()
  @IsNotEmpty()
  successorId: number;

  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;

  @IsNumber()
  @IsOptional()
  lagDays?: number;
}
