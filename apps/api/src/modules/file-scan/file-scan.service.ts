import { Injectable, Logger } from '@nestjs/common';
import { MaskingService, MaskResult } from '../masking/masking.service';
import { MlClientService } from '../ml-client/ml-client.service';
import { riskScoreToLevel } from '../weight-calculator/owasp-factors';

export interface FileScanResult {
  fileName: string;
  fileSize: number;
  totalLines: number;
  scannedLines: number;

  // PII detection
  pii: {
    found: boolean;
    totalCount: number;
    types: string[];
    details: Array<{
      line: number;
      type: string;
      original: string;
      masked: string;
    }>;
  };

  // Injection detection
  injection: {
    found: boolean;
    score: number;
    pct: string;
    severity: string;
    suspiciousLines: Array<{
      line: number;
      text: string;
      score: number;
    }>;
  };

  // Overall
  blocked: boolean;
  risk: string;
  summary: string;
}

@Injectable()
export class FileScanService {
  private readonly logger = new Logger(FileScanService.name);

  constructor(
    private readonly maskingService: MaskingService,
    private readonly mlClient: MlClientService,
  ) {}

  async scan(fileName: string, content: string): Promise<FileScanResult> {
    const MAX_LINE_LENGTH = 5000;  // 줄당 최대 5000자 (초과 시 잘림)
    const lines = content.split('\n');
    const maxLines = 500;
    const scannedLines = lines.slice(0, maxLines).map(
      (line) => line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) : line,
    );

    // 1. PII 검사 (전체 텍스트)
    const piiDetails: FileScanResult['pii']['details'] = [];

    for (let i = 0; i < scannedLines.length; i++) {
      const line = scannedLines[i];
      const maskResult = this.maskingService.mask(line);

      if (maskResult.hasPII) {
        for (const match of maskResult.matches) {
          piiDetails.push({
            line: i + 1,
            type: match.type,
            original: match.original,
            masked: match.masked,
          });
        }
      }
    }

    const piiTypes = [...new Set(piiDetails.map((d) => d.type))];

    // 2. Injection 검사 (의심스러운 줄 추출 후 ML 검사)
    const suspiciousLines: FileScanResult['injection']['suspiciousLines'] = [];

    // 텍스트에서 인젝션 가능성 있는 줄만 추출 (빈 줄, 숫자만 있는 줄 제외)
    const textLines = scannedLines
      .map((text, idx) => ({ text: text.trim(), line: idx + 1 }))
      .filter((l) => l.text.length > 10 && /[a-zA-Z가-힣]/.test(l.text));

    // 배치로 ML 스코어링 (최대 50줄)
    const linesToScore = textLines.slice(0, 50);

    if (linesToScore.length > 0) {
      const prompts = linesToScore.map((l) => l.text);
      const mlResults = await this.mlClient.batchScore(prompts);

      for (let i = 0; i < linesToScore.length; i++) {
        const score = mlResults[i]?.injection_score ?? 0;
        if (score >= 0.6) {
          suspiciousLines.push({
            line: linesToScore[i].line,
            text: linesToScore[i].text.slice(0, 100),
            score: Math.round(score * 1000) / 1000,
          });
        }
      }
    }

    // 최고 인젝션 점수
    const maxInjScore = suspiciousLines.length > 0
      ? Math.max(...suspiciousLines.map((l) => l.score))
      : 0;

    const injectionSeverity = riskScoreToLevel(maxInjScore);

    // 3. 종합 판단
    const hasPII = piiDetails.length > 0;
    const hasInjection = suspiciousLines.length > 0;
    const blocked = injectionSeverity === 'HIGH' || injectionSeverity === 'CRITICAL' || piiDetails.length >= 5;

    const riskParts: string[] = [];
    if (hasInjection) riskParts.push(`인젝션 의심 ${suspiciousLines.length}건`);
    if (hasPII) riskParts.push(`개인정보 ${piiDetails.length}건 (${piiTypes.join(', ')})`);

    const risk = blocked ? (injectionSeverity === 'CRITICAL' ? 'CRITICAL' : 'HIGH') :
      (hasInjection || hasPII) ? 'MEDIUM' : 'NOTE';

    this.logger.log(
      `[FileScan] "${fileName}" → PII:${piiDetails.length} Inj:${suspiciousLines.length} Risk:${risk}`,
    );

    return {
      fileName,
      fileSize: content.length,
      totalLines: lines.length,
      scannedLines: scannedLines.length,
      pii: {
        found: hasPII,
        totalCount: piiDetails.length,
        types: piiTypes,
        details: piiDetails.slice(0, 20), // 최대 20건
      },
      injection: {
        found: hasInjection,
        score: maxInjScore,
        pct: `${(maxInjScore * 100).toFixed(1)}%`,
        severity: injectionSeverity,
        suspiciousLines: suspiciousLines.slice(0, 10), // 최대 10건
      },
      blocked,
      risk,
      summary: riskParts.length > 0
        ? riskParts.join(', ')
        : '위험 요소가 감지되지 않았습니다.',
    };
  }
}
