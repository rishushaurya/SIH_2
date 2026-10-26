import fs from 'fs';
import https from 'https';
import { AdapterHealth, assertCitizenHash, DepartmentAdapter, RawDepartmentRecord } from './types';

export interface MtlsMaterial {
  key: Buffer;
  cert: Buffer;
  ca: Buffer;
}

export const readMtls = (files: { key: string; cert: string; ca: string }): MtlsMaterial => ({
  key: fs.readFileSync(files.key),
  cert: fs.readFileSync(files.cert),
  ca: fs.readFileSync(files.ca),
});

// Gateway side of the X-Road pattern: calls a department Security Server over mutually-authenticated TLS 1.3.
// The server is pinned to the MahaLink interop CA; the gateway presents its own client certificate.
export class RemoteAdapter implements DepartmentAdapter {
  private agent: https.Agent;

  constructor(public departmentId: string, public departmentName: string, private baseUrl: string, tls: MtlsMaterial) {
    this.agent = new https.Agent({ ...tls, minVersion: 'TLSv1.3', keepAlive: true });
  }

  private request(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; json: any }> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        new URL(path, this.baseUrl),
        { method, agent: this.agent, timeout: 2500, headers: body ? { 'Content-Type': 'application/json' } : {} },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode ?? 0, json: data ? JSON.parse(data) : null });
            } catch (err) {
              reject(err);
            }
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error('security server timeout')));
      req.on('error', reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  }

  public async ping(): Promise<AdapterHealth> {
    const start = Date.now();
    try {
      const { status, json } = await this.request('GET', '/health');
      const up = status === 200 && json?.status === 'UP';
      return { status: up ? 'UP' : 'DOWN', source: json?.source ?? 'live', latency_ms: Date.now() - start, via: 'mtls-security-server' };
    } catch {
      return { status: 'DOWN', source: 'live', latency_ms: Date.now() - start, via: 'mtls-security-server' };
    }
  }

  public async queryCitizenRecord(aadhaarHash: string, consentToken?: string): Promise<RawDepartmentRecord | null> {
    assertCitizenHash(aadhaarHash);
    const { status, json } = await this.request('POST', '/v1/query', { aadhaar_hash: aadhaarHash, consent_token: consentToken });
    if (status !== 200) throw new Error(`${this.departmentId} security server refused (${status} ${json?.error ?? ''})`);
    const record = json.record as RawDepartmentRecord | null;
    return record && { ...record, verified_source: `${record.verified_source} via mTLS security server` };
  }
}
