import {
  Body, Controller, Get, Param, Patch,
  Post, Query, UseGuards, Headers,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiSecurity } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { TestRuleDto } from './dto/test-rule.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Rules')
@Controller('api/v1/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Get()
  @ApiOperation({ summary: '룰 목록 조회' })
  findAll(@Query('enabled') enabled?: string) {
    const enabledOnly = enabled === 'true' ? true : undefined;
    return this.rulesService.findAll(enabledOnly);
  }

  @Get(':ruleId')
  @ApiOperation({ summary: '룰 단건 조회' })
  findOne(@Param('ruleId') ruleId: string) {
    return this.rulesService.findOne(ruleId);
  }

  // 관리자 전용 엔드포인트 — AdminGuard 적용
  @Post()
  @UseGuards(AdminGuard)
  @ApiSecurity('x-admin-key')
  @ApiOperation({ summary: '룰 생성 (관리자)' })
  create(
    @Body() dto: CreateRuleDto,
    @Headers('x-admin-id') actor?: string,
  ) {
    return this.rulesService.create(dto, actor);
  }

  @Patch(':ruleId')
  @UseGuards(AdminGuard)
  @ApiSecurity('x-admin-key')
  @ApiOperation({ summary: '룰 수정 (관리자)' })
  update(
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateRuleDto,
    @Headers('x-admin-id') actor?: string,
  ) {
    return this.rulesService.update(ruleId, dto, actor);
  }

  @Post('test')
  @UseGuards(AdminGuard)
  @ApiSecurity('x-admin-key')
  @ApiOperation({ summary: '룰 테스트 (관리자)' })
  test(@Body() dto: TestRuleDto) {
    return this.rulesService.test(dto);
  }
}