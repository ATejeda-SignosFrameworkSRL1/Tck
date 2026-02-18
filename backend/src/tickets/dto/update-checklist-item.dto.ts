import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateChecklistItemDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
