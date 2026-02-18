import { IsOptional, IsString } from 'class-validator';

export class UpdateAcceptanceCriteriaDto {
  @IsString()
  @IsOptional()
  description?: string;
}
