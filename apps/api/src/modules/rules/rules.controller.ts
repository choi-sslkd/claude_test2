import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@ApiTags('Admin Rules')
@Controller('admin/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @ApiOperation({ summary: '활성 룰셋 조회' })
  @Get('active')
  findActiveRules() {
    return this.rulesService.findActiveRules();
  }

  @ApiOperation({ summary: '룰 전체 조회' })
  @Get()
  findAll() {
    return this.rulesService.findAll();
  }

  @ApiOperation({ summary: '룰 단건 조회' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rulesService.findOne(id);
  }

  @ApiOperation({ summary: '룰 생성' })
  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.rulesService.create(dto);
  }

  @ApiOperation({ summary: '룰 수정' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rulesService.update(id, dto);
  }

  @ApiOperation({ summary: '룰 삭제' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }

  @ApiOperation({ summary: '가중치 재계산 (OWASP + ML)' })
  @Post(':id/recalculate')
  recalculate(@Param('id') id: string) {
    return this.rulesService.recalculateWeights(id);
  }
}