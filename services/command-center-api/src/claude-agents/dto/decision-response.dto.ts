import { IsString, IsNotEmpty } from 'class-validator';

export class DecisionResponseDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  decisionId: string;

  @IsString()
  @IsNotEmpty()
  choice: string;
}