import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { MatrixItemStatus } from '../entities/matrix-item.entity';

export class UpdateMatrixItemDto {
  @IsNumber()
  @IsOptional()
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
  deliverableEntryId?: number | null;
}
