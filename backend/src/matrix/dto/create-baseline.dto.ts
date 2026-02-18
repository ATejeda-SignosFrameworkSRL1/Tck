import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBaselineDto {
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}
