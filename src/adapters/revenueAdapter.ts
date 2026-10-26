import { Pool } from 'pg';
import { pgConfig } from '../config/env';
import { REVENUE_LAND_RECORDS } from '../db/fixtures';
import { log } from '../gateway/logger';
import { AdapterHealth, assertCitizenHash, DepartmentAdapter, liveOrFixture, probe, RawDepartmentRecord, toRecord } from './types';

// Only the columns MGAS needs (data minimisation).
const QUERY = `SELECT survey_number, sub_division, district, taluka, village, owner_name_marathi, owner_name_english,
                      land_area_hectares, assessment_tax_inr, encumbrances, last_mutation_no
               FROM revenue_land_records_712 WHERE aadhaar_hash = $1 ORDER BY id LIMIT 1`;

export class RevenueAdapter implements DepartmentAdapter {
  public departmentId = 'revenue';
  public departmentName = 'Revenue Department (Mahabhumi 7/12)';
  private pool = new Pool({ ...pgConfig, max: 10, statement_timeout: 2000, query_timeout: 2500 });

  constructor() {
    // An idle-client error (e.g. the department database restarting) must not crash the gateway.
    this.pool.on('error', (err) => log('WARN', 'revenue pool error', { error: err.message }));
  }

  public ping(): Promise<AdapterHealth> {
    return probe(() => this.pool.query('SELECT 1'));
  }

  public async queryCitizenRecord(aadhaarHash: string): Promise<RawDepartmentRecord | null> {
    assertCitizenHash(aadhaarHash);
    const result = await liveOrFixture(
      async () => (await this.pool.query(QUERY, [aadhaarHash])).rows[0] ?? null,
      () => REVENUE_LAND_RECORDS.find((r) => r.aadhaar_hash === aadhaarHash) ?? null
    );
    return toRecord(this.departmentId, aadhaarHash, 'Mahabhumi PostgreSQL', result);
  }
}

export const revenueAdapter = new RevenueAdapter();
