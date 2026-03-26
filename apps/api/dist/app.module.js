"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_config_1 = __importDefault(require("./config/app.config"));
const analyze_controller_1 = require("./modules/analyze/analyze.controller");
const analyze_service_1 = require("./modules/analyze/analyze.service");
const rules_controller_1 = require("./modules/rules/rules.controller");
const rules_service_1 = require("./modules/rules/rules.service");
const rules_repository_1 = require("./modules/rules/rules.repository");
const audit_log_module_1 = require("./modules/audit-log/audit-log.module");
const health_controller_1 = require("./modules/health/health.controller");
const admin_guard_1 = require("./common/guards/admin.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default],
            }),
            audit_log_module_1.AuditLogModule,
        ],
        controllers: [
            analyze_controller_1.AnalyzeController,
            rules_controller_1.RulesController,
            health_controller_1.HealthController,
        ],
        providers: [
            analyze_service_1.AnalyzeService,
            rules_service_1.RulesService,
            rules_repository_1.RulesRepository,
            admin_guard_1.AdminGuard,
        ],
    })
], AppModule);
