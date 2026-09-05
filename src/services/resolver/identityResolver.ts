import { calculateStringSimilarity, calculateTokenSimilarity } from './levenshtein';
import { normalizeName } from './transliteration';

export interface IdentityMatchCandidate {
  department: string;
  source_name: string;
  source_aadhaar_hash: string;
  source_address?: string;
}

export interface IdentityResolutionResult {
  isMatch: boolean;
  confidenceScore: number;
  flag: 'AUTO_RESOLVED' | 'VERIFICATION_REQUIRED' | 'MISMATCH';
  details: {
    aadhaar_match: boolean;
    name_similarity: number;
    normalized_primary_name: string;
    normalized_candidate_name: string;
  };
}

export class IdentityResolver {
  public static resolve(
    primaryCitizen: { full_name: string; aadhaar_hash: string },
    candidate: IdentityMatchCandidate
  ): IdentityResolutionResult {
    const aadhaarMatch = primaryCitizen.aadhaar_hash === candidate.source_aadhaar_hash;

    const normPrimary = normalizeName(primaryCitizen.full_name);
    const normCandidate = normalizeName(candidate.source_name);

    // Calculate direct and token-set similarity
    const directSim = calculateStringSimilarity(normPrimary, normCandidate);
    const tokenSim = calculateTokenSimilarity(normPrimary, normCandidate);
    const nameSimilarity = Math.max(directSim, tokenSim);

    // Multi-Factor Composite Score
    let confidenceScore = 0;
    if (aadhaarMatch) {
      confidenceScore = 0.50 + 0.50 * nameSimilarity;
    } else {
      confidenceScore = 0.70 * nameSimilarity;
    }

    // Determine Action Boundary
    let flag: IdentityResolutionResult['flag'] = 'MISMATCH';
    let isMatch = false;

    if (confidenceScore >= 0.90) {
      flag = 'AUTO_RESOLVED';
      isMatch = true;
    } else if (confidenceScore >= 0.70) {
      flag = 'VERIFICATION_REQUIRED';
      isMatch = true;
    } else {
      flag = 'MISMATCH';
      isMatch = false;
    }

    return {
      isMatch,
      confidenceScore: Math.round(confidenceScore * 1000) / 1000,
      flag,
      details: {
        aadhaar_match: aadhaarMatch,
        name_similarity: Math.round(nameSimilarity * 1000) / 1000,
        normalized_primary_name: normPrimary,
        normalized_candidate_name: normCandidate,
      },
    };
  }
}
