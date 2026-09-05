import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { certificateAdapter } from '../../adapters/certificateAdapter';
import { educationAdapter } from '../../adapters/educationAdapter';
import { revenueAdapter } from '../../adapters/revenueAdapter';
import { rtoAdapter } from '../../adapters/rtoAdapter';
import { EventBroadcaster } from '../audit/eventBroadcaster';
import { auditLedger } from '../audit/hashChain';
import { ConsentManager } from '../consent/consentManager';
import { MGASNormalizer, NormalizedMGASPayload } from '../normalizer/mgasNormalizer';
import { IdentityResolver } from '../resolver/identityResolver';
import { MissingDocDetector, MissingDocumentAlert } from '../rules/missingDocDetector';

export interface WorkflowExecutionResult {
  journey_id: string;
  citizen_profile: {
    full_name: string;
    aadhaar_hash: string;
  };
  consent_jti: string;
  mgas_data: NormalizedMGASPayload;
  missing_documents: MissingDocumentAlert[];
  audit_block: {
    index: number;
    block_hash: string;
    timestamp: string;
  };
  execution_metrics: {
    total_duration_ms: number;
    departments_queried: string[];
    resolver_matches: Array<{
      department: string;
      confidence: number;
      flag: string;
    }>;
  };
}

export class WorkflowEngine {
  private static journeysMap: Map<string, any> = new Map();

  public static initialize(): void {
    if (this.journeysMap.size > 0) return;

    const possibleDirs = [
      path.resolve(process.cwd(), 'src/services/workflow/journeyConfigs'),
      path.resolve(process.cwd(), 'dist/services/workflow/journeyConfigs'),
    ];

    let foundDir = possibleDirs.find((d) => fs.existsSync(d));

    if (foundDir) {
      const files = fs.readdirSync(foundDir);
      files.forEach((file) => {
        if (file.endsWith('.json')) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(foundDir!, file), 'utf8'));
            this.journeysMap.set(content.id, content);
          } catch {
            // continue
          }
        }
      });
    }
  }

  public static getJourneys(): any[] {
    this.initialize();
    return Array.from(this.journeysMap.values());
  }

  public static getJourney(id: string): any {
    this.initialize();
    return this.journeysMap.get(id);
  }

  public static async executeJourney(params: {
    journey_id: string;
    citizen: { full_name: string; aadhaar_hash: string };
    consent_token: string;
  }): Promise<WorkflowExecutionResult> {
    this.initialize();
    const startTime = Date.now();

    const journey = this.journeysMap.get(params.journey_id);
    if (!journey) {
      throw new Error(`Journey ${params.journey_id} is not registered in the workflow engine.`);
    }

    // 1. Verify DEPA Consent Token
    const requiredDepts: string[] = journey.required_departments;
    for (const dept of requiredDepts) {
      const check = ConsentManager.verifyConsent(params.consent_token, dept);
      if (!check.valid) {
        throw new Error(`DEPA Consent Verification Failed for department '${dept}': ${check.error}`);
      }
    }

    EventBroadcaster.emit('EVENT_QUERY_DISPATCH', {
      journey_id: params.journey_id,
      departments: requiredDepts,
      citizen_hash: params.citizen.aadhaar_hash.slice(0, 12) + '...',
    });

    // 2. Dispatch Parallel Queries to Department Adapters
    const queryPromises = requiredDepts.map(async (dept) => {
      const t0 = Date.now();
      let record = null;
      if (dept === 'revenue') {
        record = await revenueAdapter.queryCitizenRecord(params.citizen.aadhaar_hash, params.consent_token);
      } else if (dept === 'rto') {
        record = await rtoAdapter.queryCitizenRecord(params.citizen.aadhaar_hash, params.consent_token);
      } else if (dept === 'certificates') {
        record = await certificateAdapter.queryCitizenRecord(params.citizen.aadhaar_hash, params.consent_token);
      } else if (dept === 'education') {
        record = await educationAdapter.queryCitizenRecord(params.citizen.aadhaar_hash, params.consent_token);
      }
      return { dept, record, duration_ms: Date.now() - t0 };
    });

    const queryResults = await Promise.all(queryPromises);
    const rawDeptData: Record<string, any> = {};
    const resolverMatches: Array<{ department: string; confidence: number; flag: string }> = [];

    // 3. Identity Resolution & Verification across raw department responses
    queryResults.forEach(({ dept, record, duration_ms }) => {
      if (record && record.data) {
        rawDeptData[dept] = record;

        // Extract name for cross-check
        let candidateName = params.citizen.full_name;
        if (dept === 'revenue' && record.data.owner_name_marathi) {
          candidateName = record.data.owner_name_marathi;
        } else if (dept === 'rto' && record.data.driving_license?.holder_name) {
          candidateName = record.data.driving_license.holder_name;
        } else if (dept === 'certificates' && record.data.applicant_details?.full_name_english) {
          candidateName = record.data.applicant_details.full_name_english;
        } else if (dept === 'education' && record.data.candidate_name_en) {
          candidateName = record.data.candidate_name_en;
        }

        const matchResult = IdentityResolver.resolve(params.citizen, {
          department: dept,
          source_name: candidateName,
          source_aadhaar_hash: record.aadhaar_hash,
        });

        resolverMatches.push({
          department: dept,
          confidence: matchResult.confidenceScore,
          flag: matchResult.flag,
        });

        EventBroadcaster.emit('EVENT_IDENTITY_MATCH', {
          department: dept,
          candidate_name: candidateName,
          primary_name: params.citizen.full_name,
          confidence: matchResult.confidenceScore,
          flag: matchResult.flag,
          duration_ms,
        });
      }
    });

    // 4. MGAS Canonical Data Normalization
    const normalizedData = MGASNormalizer.normalize(params.citizen, rawDeptData);

    EventBroadcaster.emit('EVENT_NORMALIZER', {
      journey_id: params.journey_id,
      sources_verified: normalizedData.verification_summary.sources_verified,
    });

    // 5. Missing Documents Rule Evaluation
    const missingDocs = MissingDocDetector.evaluate(params.journey_id, rawDeptData);

    // 6. Cryptographic Audit Ledger Entry Mining (SHA-256 Hash Chain)
    const confidenceAvg = resolverMatches.length > 0
      ? Math.round((resolverMatches.reduce((sum, m) => sum + m.confidence, 0) / resolverMatches.length) * 1000) / 1000
      : 1.0;

    normalizedData.verification_summary.resolution_confidence_average = confidenceAvg;

    const payloadDigest = crypto.createHash('sha256').update(JSON.stringify(normalizedData)).digest('hex');

    const auditBlock = auditLedger.append({
      actor_id: params.citizen.aadhaar_hash,
      action: 'WORKFLOW_EXECUTE',
      journey_id: params.journey_id,
      purpose: journey.title_en,
      consent_jti: 'DEPA_CONSENT_VALIDATED',
      payload_digest: payloadDigest,
      metadata: {
        sources_verified: normalizedData.verification_summary.sources_verified,
        resolver_confidence_avg: confidenceAvg,
      },
    });

    EventBroadcaster.emit('EVENT_AUDIT_MINED', {
      block_index: auditBlock.index,
      block_hash: auditBlock.block_hash,
      prev_hash: auditBlock.prev_hash,
    });

    const totalDuration = Date.now() - startTime;

    return {
      journey_id: params.journey_id,
      citizen_profile: {
        full_name: params.citizen.full_name,
        aadhaar_hash: params.citizen.aadhaar_hash,
      },
      consent_jti: 'DEPA_CONSENT_VALIDATED',
      mgas_data: normalizedData,
      missing_documents: missingDocs,
      audit_block: {
        index: auditBlock.index,
        block_hash: auditBlock.block_hash,
        timestamp: auditBlock.timestamp,
      },
      execution_metrics: {
        total_duration_ms: totalDuration,
        departments_queried: requiredDepts,
        resolver_matches: resolverMatches,
      },
    };
  }
}
