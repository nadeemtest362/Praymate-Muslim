import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class StartMissionDto {
  @IsString()
  @IsNotEmpty()
  mission: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}