import { MongoClient } from 'mongodb';
import { env } from '../config/env';
import { CERTIFICATES } from '../db/fixtures';
import { AdapterHealth, assertCitizenHash, DepartmentAdapter, liveOrFixture, probe, RawDepartmentRecord, toRecord } from './types';

export class CertificateAdapter implements DepartmentAdapter {
  public departmentId = 'certificates';
  public departmentName = 'Certificate Services (Income, Caste & Domicile)';
  // The driver connects lazily on first operation and fails after serverSelectionTimeoutMS.
  private client = new MongoClient(env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });

  public ping(): Promise<AdapterHealth> {
    return probe(() => this.client.db().command({ ping: 1 }));
  }

  public async queryCitizenRecord(aadhaarHash: string): Promise<RawDepartmentRecord | null> {
    assertCitizenHash(aadhaarHash);
    const result = await liveOrFixture<{ certificates: Record<string, unknown>[] } | null>(
      async () => {
        // Typed equality filter on a validated hex string: no operator injection possible.
        const certificates = await this.client
          .db()
          .collection('citizen_certificates')
          .find({ aadhaar_hash: aadhaarHash }, { projection: { _id: 0 } })
          .maxTimeMS(2000)
          .toArray();
        return certificates.length ? { certificates } : null;
      },
      () => {
        const certificates = CERTIFICATES.filter((c) => c.aadhaar_hash === aadhaarHash);
        return certificates.length ? { certificates } : null;
      }
    );
    return toRecord(this.departmentId, aadhaarHash, 'MahaOnline e-District MongoDB', result);
  }
}

export const certificateAdapter = new CertificateAdapter();
