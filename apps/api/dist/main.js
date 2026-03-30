"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const validation_pipe_1 = require("./common/pipes/validation.pipe");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // 전역 파이프 / 필터 / 인터셉터
    app.useGlobalPipes(validation_pipe_1.globalValidationPipe);
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    // CORS
    app.enableCors();
    // Swagger 문서
    const swagger = new swagger_1.DocumentBuilder()
        .setTitle('Prompt Guard API')
        .setDescription('AI 프롬프트 보안 분석 API')
        .setVersion('1.0')
        .addApiKey({ type: 'apiKey', name: 'x-admin-key', in: 'header' }, 'x-admin-key')
        .build();
    swagger_1.SwaggerModule.setup('docs', app, swagger_1.SwaggerModule.createDocument(app, swagger));
    const config = app.get(config_1.ConfigService);
    const port = config.get('app.port', 3000);
    await app.listen(port);
    console.log(`✅ Prompt Guard API 실행 중 → http://localhost:${port}`);
    console.log(`📄 Swagger 문서 → http://localhost:${port}/docs`);
}
bootstrap();
