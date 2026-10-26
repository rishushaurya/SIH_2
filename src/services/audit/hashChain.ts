import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

export type AuditAction =
  | 'SYSTEM_INIT'
  | 'CONSENT_GRANT'
  | 'CONSENT_REVOKE'
  | 'DATA_FETCH'
  | 'WORKFLOW_EXECUTE'
  | 'FORM_SUBMIT';

export interface AuditEntryData {
  actor_id: string;
  action: AuditAction;
  department?: string;
  journey_id?: string;
  purpose: string;
  consent_jti?: string;
  payload_digest: string;
  metadata?: Record<string, unknown>;
}

export interface AuditBlock extends AuditEntryData {
  index: number;
  timestamp: string;
  prev_hash: string;
  block_hash: string;
}

// Deterministic JSON (sorted keys) so every field, including nested metadata, is covered by the hash.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => (value as any)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as any)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
export const digestOf = (value: unknown) => sha256(canonical(value));

const hashBlock = ({ block_hash: _ignored, ...rest }: AuditBlock) => sha256(canonical(rest));

const GENESIS: AuditBlock = {
  index: 0,
  timestamp: '2026-09-01T00:00:00.000Z',
  actor_id: 'SYSTEM_GENESIS',
  action: 'SYSTEM_INIT',
  purpose: 'MahaLink State Interoperability Genesis Node',
  payload_digest: 'GENESIS_PAYLOAD_DIGEST',
  prev_hash: '0'.repeat(64),
  block_hash: '',
};
GENESIS.block_hash = hashBlock(GENESIS);

// Append-only JSONL ledger (DPDP Rules 2025 r.6: access logs retained for at least one year).
// seniordev: single-writer file; for several gateway instances use a Postgres table with UPDATE/DELETE revoked.
export class HashChainLedger {
  private blocks: AuditBlock[] = [];

  constructor(private readonly filePath = '') {
    if (filePath && fs.existsSync(filePath)) {
      this.blocks = fs
        .readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line, i) => {
          try {
            return JSON.parse(line) as AuditBlock;
          } catch {
            throw new Error(`Audit ledger ${filePath} is corrupted at line ${i + 1}.`);
          }
        });
    }
    if (this.blocks.length === 0) this.persist({ ...GENESIS });
  }

  private persist(block: AuditBlock): void {
    if (this.filePath) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.appendFileSync(this.filePath, `${JSON.stringify(block)}\n`);
    }
    this.blocks.push(block);
  }

  public append(data: AuditEntryData): AuditBlock {
    const prev = this.blocks[this.blocks.length - 1];
    const block: AuditBlock = {
      ...data,
      index: prev.index + 1,
      timestamp: new Date().toISOString(),
      prev_hash: prev.block_hash,
      block_hash: '',
    };
    block.block_hash = hashBlock(block);
    this.persist(block);
    return block;
  }

  public verifyChainIntegrity(): { isValid: boolean; totalBlocks: number; corruptedBlockIndex?: number; message: string } {
    const totalBlocks = this.blocks.length;
    for (let i = 0; i < totalBlocks; i++) {
      const block = this.blocks[i];
      const expectedPrev = i === 0 ? GENESIS.prev_hash : this.blocks[i - 1].block_hash;
      if (block.index !== i || block.prev_hash !== expectedPrev) {
        return { isValid: false, totalBlocks, corruptedBlockIndex: i, message: `Broken link at block #${i}: chain pointer or index mismatch.` };
      }
      if (hashBlock(block) !== block.block_hash) {
        return { isValid: false, totalBlocks, corruptedBlockIndex: i, message: `Tampered content at block #${i}: recomputed hash does not match.` };
      }
    }
    return { isValid: true, totalBlocks, message: `Audit chain intact. Verified ${totalBlocks} blocks with zero tampering detected.` };
  }

  // Newest first.
  public getBlocks(limit = 50, filter: (b: AuditBlock) => boolean = () => true): AuditBlock[] {
    return this.blocks.filter(filter).slice(-limit).reverse();
  }

  public allBlocks(): readonly AuditBlock[] {
    return this.blocks;
  }

  public findByHash(blockHash: string): AuditBlock | undefined {
    return this.blocks.find((b) => b.block_hash === blockHash);
  }

  public getBlockCount(): number {
    return this.blocks.length;
  }

  // In-memory tamper for demonstrations and tests; the file on disk is untouched.
  public tamperBlockForTest(index: number, newDigest: string): void {
    if (this.blocks[index]) this.blocks[index].payload_digest = newDigest;
  }
}

export const auditLedger = new HashChainLedger(env.AUDIT_LOG_PATH);
