import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMatrixItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  projectId: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  parentId?: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

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

  @IsBoolean()
  @IsOptional()
  isDeliverable?: boolean;

  @IsNumber()
  @IsOptional()
  deliverableEntryId?: number | null;
}
