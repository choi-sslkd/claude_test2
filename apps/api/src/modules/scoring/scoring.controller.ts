import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ScoringService } from './scoring.service';
import { ScoreRequestDto } from './dto/score-request.dto';
import { ScoreResponseDto } from './dto/score-response.dto';

@ApiTags('Scoring')
@Controller('api/v1')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('score')
  @HttpCode(200)
  @ApiOperation({ summary: '통합 프롬프트 스코어링 (Injection + Ambiguity)' })
  @ApiResponse({ status: 200, type: ScoreResponseDto })
  async score(@Body() dto: ScoreRequestDto): Promise<ScoreResponseDto> {
    return this.scoringService.score(dto.prompt);
  }
}
