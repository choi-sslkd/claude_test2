import { Injectable } from '@nestjs/common';

export interface MaskMatch {
  type: string;
  original: string;
  masked: string;
  index: number;
}

export interface MaskResult {
  maskedPrompt: string;
  hasPII: boolean;
  matches: MaskMatch[];
  summary: string;
}

interface PatternDef {
  type: string;
  label: string;
  regex: RegExp;
  mask: (match: string, groups?: Record<string, string>) => string;
}

const PII_PATTERNS: PatternDef[] = [
  // 주민등록번호 (한국): 6자리-7자리
  {
    type: 'KR_SSN',
    label: '주민등록번호',
    regex: /\b(\d{6})\s*[-–]\s*(\d{7})\b/g,
    mask: () => '******-*******',
  },
  // 여권번호 (한국): M12345678
  {
    type: 'KR_PASSPORT',
    label: '여권번호',
    regex: /\b([A-Z]{1,2}\d{7,8})\b/g,
    mask: (m) => m[0] + '*'.repeat(m.length - 1),
  },
  // 신용카드번호: 4자리-4자리-4자리-4자리
  {
    type: 'CREDIT_CARD',
    label: '카드번호',
    regex: /\b(\d{4})\s*[-–]?\s*(\d{4})\s*[-–]?\s*(\d{4})\s*[-–]?\s*(\d{4})\b/g,
    mask: (_m, g) => `****-****-****-${g?.['4'] || '****'}`,
  },
  // 전화번호 (한국): 010-1234-5678, 01012345678
  {
    type: 'PHONE_KR',
    label: '전화번호',
    regex: /\b(01[016789])\s*[-–.]?\s*(\d{3,4})\s*[-–.]?\s*(\d{4})\b/g,
    mask: (_m, g) => `${g?.['1'] || '010'}-****-****`,
  },
  // 이메일
  {
    type: 'EMAIL',
    label: '이메일',
    regex: /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    mask: (_m, g) => {
      const user = g?.['1'] || '';
      const domain = g?.['2'] || '';
      return user[0] + '***@' + domain;
    },
  },
  // IP 주소
  {
    type: 'IP_ADDRESS',
    label: 'IP주소',
    regex: /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
    mask: (_m, g) => `${g?.['1'] || '*'}.***.***.*${g?.['4']?.slice(-1) || '*'}`,
  },
  // API 키 (sk-, pk-, api_, key_ 등)
  {
    type: 'API_KEY',
    label: 'API키',
    regex: /\b(sk[-_]|pk[-_]|api[-_]|key[-_]|token[-_]|secret[-_])([a-zA-Z0-9_-]{8,})\b/gi,
    mask: (_m, g) => `${g?.['1'] || ''}${'*'.repeat(16)}`,
  },
  // AWS 키: AKIA로 시작하는 20자리
  {
    type: 'AWS_KEY',
    label: 'AWS키',
    regex: /\b(AKIA[A-Z0-9]{16})\b/g,
    mask: () => 'AKIA****************',
  },
  // 비밀번호 패턴: password=xxx, pwd: xxx, 비밀번호: xxx
  {
    type: 'PASSWORD',
    label: '비밀번호',
    regex: /((?:password|passwd|pwd|비밀번호|패스워드)\s*[=:]\s*)(\S+)/gi,
    mask: (_m, g) => `${g?.['1'] || 'password='}${'*'.repeat(8)}`,
  },
  // 계좌번호 (한국): 10~14자리 숫자 (하이픈 포함)
  {
    type: 'BANK_ACCOUNT',
    label: '계좌번호',
    regex: /\b(\d{3,4})\s*[-–]\s*(\d{2,6})\s*[-–]\s*(\d{4,6})\b/g,
    mask: () => '***-******-****',
  },
];

@Injectable()
export class MaskingService {
  mask(prompt: string): MaskResult {
    const matches: MaskMatch[] = [];
    let maskedPrompt = prompt;

    for (const pattern of PII_PATTERNS) {
      // Reset regex lastIndex
      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(prompt)) !== null) {
        const original = match[0];

        // Build named-like groups from positional groups
        const groups: Record<string, string> = {};
        for (let i = 1; i < match.length; i++) {
          groups[String(i)] = match[i] || '';
        }

        const masked = pattern.mask(original, groups);

        // Avoid duplicate detections at same index
        if (!matches.some((m) => m.index === match!.index && m.type === pattern.type)) {
          matches.push({
            type: pattern.type,
            original,
            masked,
            index: match.index,
          });
        }
      }
    }

    // Apply masking (from end to start to preserve indices)
    const sortedMatches = [...matches].sort((a, b) => b.index - a.index);
    for (const m of sortedMatches) {
      maskedPrompt =
        maskedPrompt.slice(0, m.index) +
        m.masked +
        maskedPrompt.slice(m.index + m.original.length);
    }

    const typeLabels = [...new Set(matches.map((m) => {
      const def = PII_PATTERNS.find((p) => p.type === m.type);
      return def?.label || m.type;
    }))];

    return {
      maskedPrompt,
      hasPII: matches.length > 0,
      matches,
      summary: matches.length > 0
        ? `${typeLabels.join(', ')} ${matches.length}건 마스킹됨`
        : '',
    };
  }
}
