import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface MlScoreResult {
  injection_score: number;
  ambiguity_score: number;
  injection_pct: string;
  ambiguity_pct: string;
  latency_ms: number;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('mlApiUrl') ?? 'http://localhost:8000';
  }

  async score(prompt: string): Promise<MlScoreResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<MlScoreResult>(`${this.baseUrl}/v1/score`, { prompt }, { timeout: 5000 }),
      );
      return data;
    } catch (error) {
      this.logger.warn(`ML API call failed: ${(error as Error).message}`);
      return {
        injection_score: 0,
        ambiguity_score: 0,
        injection_pct: '0.0%',
        ambiguity_pct: '0.0%',
        latency_ms: 0,
      };
    }
  }

  async batchScore(prompts: string[]): Promise<MlScoreResult[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<{ results: MlScoreResult[] }>(
          `${this.baseUrl}/v1/batch-score`,
          { prompts },
          { timeout: 10000 },
        ),
      );
      return data.results;
    } catch (error) {
      this.logger.warn(`ML batch API call failed: ${(error as Error).message}`);
      return prompts.map(() => ({
        injection_score: 0,
        ambiguity_score: 0,
        injection_pct: '0.0%',
        ambiguity_pct: '0.0%',
        latency_ms: 0,
      }));
    }
  }
}
