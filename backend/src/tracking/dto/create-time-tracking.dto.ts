import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateTimeTrackingDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0.1)
  hoursSpent: number;

  @IsString()
  @IsOptional()
  description?: string;
}
