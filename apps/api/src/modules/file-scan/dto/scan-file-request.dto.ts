import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanFileRequestDto {
  @ApiProperty({ description: '파일 이름', example: 'data.csv' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: '파일 텍스트 내용 (클라이언트에서 읽어서 전송)', maxLength: 500000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500000)
  content: string;
}
