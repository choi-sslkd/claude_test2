/**
 * OWASP Risk Rating Methodology factor scores per category.
 * Each factor is scored 0-9 per the official methodology:
 * https://owasp.org/www-community/OWASP_Risk_Rating_Methodology
 *
 * Likelihood factors: ease_of_exploit, awareness, opportunity, motive
 * Impact factors: confidentiality, integrity, availability, accountability
 */

export interface OwaspFactors {
  likelihood: { ease: number; awareness: number; opportunity: number; motive: number };
  impact: { confidentiality: number; integrity: number; availability: number; accountability: number };
}

export const OWASP_CATEGORY_FACTORS: Record<string, OwaspFactors> = {
  PROMPT_INJECTION: {
    likelihood: { ease: 7, awareness: 8, opportunity: 7, motive: 9 },
    impact: { confidentiality: 8, integrity: 9, availability: 5, accountability: 7 },
  },
  SYSTEM_PROMPT_EXTRACTION: {
    likelihood: { ease: 6, awareness: 7, opportunity: 6, motive: 8 },
    impact: { confidentiality: 9, integrity: 7, availability: 3, accountability: 8 },
  },
  JAILBREAK: {
    likelihood: { ease: 5, awareness: 7, opportunity: 6, motive: 9 },
    impact: { confidentiality: 7, integrity: 9, availability: 6, accountability: 8 },
  },
  DATA_EXFILTRATION: {
    likelihood: { ease: 4, awareness: 6, opportunity: 5, motive: 9 },
    impact: { confidentiality: 9, integrity: 8, availability: 4, accountability: 9 },
  },
  AMBIGUOUS_REQUEST: {
    likelihood: { ease: 8, awareness: 4, opportunity: 8, motive: 3 },
    impact: { confidentiality: 2, integrity: 3, availability: 5, accountability: 3 },
  },
  POLICY_BYPASS: {
    likelihood: { ease: 5, awareness: 6, opportunity: 5, motive: 8 },
    impact: { confidentiality: 6, integrity: 8, availability: 5, accountability: 7 },
  },
  SENSITIVE_DATA: {
    likelihood: { ease: 4, awareness: 5, opportunity: 4, motive: 7 },
    impact: { confidentiality: 9, integrity: 6, availability: 3, accountability: 8 },
  },
  CUSTOM: {
    likelihood: { ease: 5, awareness: 5, opportunity: 5, motive: 5 },
    impact: { confidentiality: 5, integrity: 5, availability: 5, accountability: 5 },
  },
};

export function calcLikelihood(f: OwaspFactors['likelihood']): number {
  return (f.ease + f.awareness + f.opportunity + f.motive) / 4;
}

export function calcImpact(f: OwaspFactors['impact']): number {
  return (f.confidentiality + f.integrity + f.availability + f.accountability) / 4;
}

/** Normalize risk score to 0-1 range (max possible = 9*9 = 81) */
export function calcOwaspRisk(likelihood: number, impact: number): number {
  return (likelihood * impact) / 81;
}

export function riskScoreToLevel(score: number): string {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.55) return 'HIGH';
  if (score >= 0.35) return 'MEDIUM';
  if (score >= 0.15) return 'LOW';
  return 'NOTE';
}
