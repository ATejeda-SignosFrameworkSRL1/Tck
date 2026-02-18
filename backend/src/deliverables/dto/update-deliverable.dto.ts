import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { DeliverableStatus } from '../entities/deliverable-entry.entity';

export class UpdateDeliverableDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  phase?: number;

  @IsString()
  @IsOptional()
  responsibleFront?: string;

  @IsDateString()
  @IsOptional()
  plannedDeliveryDate?: string;

  @IsDateString()
  @IsOptional()
  actualDeliveryDate?: string;

  @IsEnum(DeliverableStatus)
  @IsOptional()
  status?: DeliverableStatus;

  @IsNumber()
  @IsOptional()
  progressPercentage?: number;

  @IsString()
  @IsOptional()
  elaborationResponsibleName?: string;

  @IsString()
  @IsOptional()
  elaborationResponsibleOrg?: string;

  @IsString()
  @IsOptional()
  acceptanceCriteria?: string;

  @IsString()
  @IsOptional()
  reviewInstanceName?: string;

  @IsString()
  @IsOptional()
  approvalInstanceName?: string;

  @IsString()
  @IsOptional()
  baselinePhotoBefore?: string;

  @IsString()
  @IsOptional()
  baselinePhotoAfter?: string;

  @IsNumber()
  @IsOptional()
  imageUploadIdBefore?: number;

  @IsNumber()
  @IsOptional()
  imageUploadIdAfter?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
