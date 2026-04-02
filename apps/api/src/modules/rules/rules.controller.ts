import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@ApiTags('Admin Rules')
@Controller('admin/rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  // 인증 불필요: 크롬 확장이 호출
  @ApiOperation({ summary: '활성 룰셋 조회 (공개)' })
  @Get('active')
  findActiveRules() {
    return this.rulesService.findActiveRules();
  }

  // 아래는 JWT 인증 필요 (Authorization: Bearer <token>)
  @ApiOperation({ summary: '룰 전체 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.rulesService.findAll();
  }

  @ApiOperation({ summary: '룰 단건 조회' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rulesService.findOne(id);
  }

  @ApiOperation({ summary: '룰 생성' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.rulesService.create(dto);
  }

  @ApiOperation({ summary: '룰 수정' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rulesService.update(id, dto);
  }

  @ApiOperation({ summary: '룰 삭제' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rulesService.remove(id);
  }

  @ApiOperation({ summary: '가중치 재계산 (OWASP + ML)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/recalculate')
  recalculate(@Param('id') id: string) {
    return this.rulesService.recalculateWeights(id);
  }
}
