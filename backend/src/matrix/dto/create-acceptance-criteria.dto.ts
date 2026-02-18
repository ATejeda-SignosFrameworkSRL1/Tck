import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAcceptanceCriteriaDto {
  @IsString()
  @IsNotEmpty()
  description: string;
}
