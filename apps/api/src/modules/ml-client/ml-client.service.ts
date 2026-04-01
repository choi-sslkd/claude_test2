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

export interface MlHealthStatus {
  available: boolean;
  degraded: boolean;
  lastChecked: string;
  consecutiveFailures: number;
  message: string;
}

@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly baseUrl: string;
  private readonly mlApiKey: string;

  // ML 서버 상태 추적
  private _consecutiveFailures = 0;
  private _lastCheckTime = '';
  private _lastAvailable = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('mlApiUrl') ?? 'http://localhost:8001';
    this.mlApiKey = this.config.get<string>('app.mlApiKey') ?? 'ml-internal-key';
  }

  /** ML 서버가 현재 사용 가능한지 */
  get isAvailable(): boolean {
    return this._lastAvailable;
  }

  /** ML 서버 상태 (API 응답에 포함) */
  get healthStatus(): MlHealthStatus {
    const degraded = this._consecutiveFailures > 0;
    let message = 'ML 서버 정상';

    if (this._consecutiveFailures >= 3) {
      message = `ML 서버 장애 (연속 ${this._consecutiveFailures}회 실패). 패턴 매칭만 동작 중.`;
    } else if (this._consecutiveFailures > 0) {
      message = `ML 서버 불안정 (연속 ${this._consecutiveFailures}회 실패). ML 점수가 부정확할 수 있습니다.`;
    }

    return {
      available: this._lastAvailable,
      degraded,
      lastChecked: this._lastCheckTime,
      consecutiveFailures: this._consecutiveFailures,
      message,
    };
  }

  async score(prompt: string): Promise<MlScoreResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<MlScoreResult>(`${this.baseUrl}/v1/score`, { prompt }, { timeout: 5000, headers: { 'x-ml-key': this.mlApiKey } }),
      );
      this._onSuccess();
      return data;
    } catch (error) {
      this._onFailure((error as Error).message);
      return this._fallbackResult();
    }
  }

  async batchScore(prompts: string[]): Promise<MlScoreResult[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<{ results: MlScoreResult[] }>(
          `${this.baseUrl}/v1/batch-score`,
          { prompts },
          { timeout: 10000, headers: { 'x-ml-key': this.mlApiKey } },
        ),
      );
      this._onSuccess();
      return data.results;
    } catch (error) {
      this._onFailure((error as Error).message);
      return prompts.map(() => this._fallbackResult());
    }
  }

  /** 헬스체크 (주기적으로 호출 가능) */
  async checkHealth(): Promise<boolean> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/v1/health`, { timeout: 3000, headers: { 'x-ml-key': this.mlApiKey } }),
      );
      this._onSuccess();
      return data?.status === 'ok';
    } catch {
      this._onFailure('Health check failed');
      return false;
    }
  }

  private _onSuccess(): void {
    if (this._consecutiveFailures > 0) {
      this.logger.log(`ML 서버 복구됨 (이전 ${this._consecutiveFailures}회 실패 후)`);
    }
    this._consecutiveFailures = 0;
    this._lastAvailable = true;
    this._lastCheckTime = new Date().toISOString();
  }

  private _onFailure(errorMsg: string): void {
    this._consecutiveFailures++;
    this._lastAvailable = false;
    this._lastCheckTime = new Date().toISOString();

    if (this._consecutiveFailures === 1) {
      this.logger.warn(`ML 서버 응답 실패: ${errorMsg}`);
    } else if (this._consecutiveFailures === 3) {
      this.logger.error(`ML 서버 장애 감지 (연속 3회 실패). 축소 운영 모드 진입.`);
    } else if (this._consecutiveFailures % 10 === 0) {
      this.logger.error(`ML 서버 장애 지속 중 (연속 ${this._consecutiveFailures}회 실패)`);
    }
  }

  private _fallbackResult(): MlScoreResult {
    return {
      injection_score: 0,
      ambiguity_score: 0,
      injection_pct: '0.0%',
      ambiguity_pct: '0.0%',
      latency_ms: 0,
    };
  }
}
