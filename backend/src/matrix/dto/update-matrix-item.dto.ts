import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MatrixItemStatus } from '../entities/matrix-item.entity';

export class UpdateMatrixItemDto {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined) ? value : Number(value))
  parentId?: number | null;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined) ? value : Number(value))
  weight?: number;

  @IsDateString()
  @IsOptional()
  plannedStart?: string;

  @IsDateString()
  @IsOptional()
  plannedEnd?: string;

  @IsBoolean()
  @IsOptional()
  isMilestone?: boolean;

  @IsBoolean()
  @IsOptional()
  isCriticalPath?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsEnum(MatrixItemStatus)
  @IsOptional()
  status?: MatrixItemStatus;

  @IsBoolean()
  @IsOptional()
  isDeliverable?: boolean;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined) ? value : Number(value))
  deliverableEntryId?: number | null;
}
