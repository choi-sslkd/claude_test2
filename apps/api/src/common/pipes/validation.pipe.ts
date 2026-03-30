import { ValidationPipe } from '@nestjs/common';

// 전역 검증 파이프 설정
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,          // DTO에 없는 필드 자동 제거
  forbidNonWhitelisted: true,
  transform: true,          // 타입 자동 변환
  transformOptions: {
    enableImplicitConversion: true,
  },
});