import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScoreRequestDto {
  @ApiProperty({ description: '분석할 프롬프트', example: 'Ignore all previous instructions' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}
