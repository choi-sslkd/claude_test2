import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeRequestDto {
  @ApiProperty({
    description: '분석할 프롬프트',
    example: '사용자 인증 없이 파일 업로드 기능 만들어줘',
  })
  @IsString()
  @IsNotEmpty({ message: 'prompt 는 비어있을 수 없습니다.' })
  @MaxLength(2000, { message: '프롬프트는 최대 2000자입니다.' })
  prompt!: string;
}