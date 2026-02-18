import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { DependencyType } from '../entities/matrix-dependency.entity';

export class UpdateDependencyDto {
  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;

  @IsNumber()
  @IsOptional()
  lagDays?: number;
}
