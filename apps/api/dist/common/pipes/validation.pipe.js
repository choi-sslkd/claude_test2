"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalValidationPipe = void 0;
const common_1 = require("@nestjs/common");
// 전역 검증 파이프 설정
exports.globalValidationPipe = new common_1.ValidationPipe({
    whitelist: true, // DTO에 없는 필드 자동 제거
    forbidNonWhitelisted: true,
    transform: true, // 타입 자동 변환
    transformOptions: {
        enableImplicitConversion: true,
    },
});
