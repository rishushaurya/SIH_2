import crypto from 'crypto';

export interface AuditEntryData {
  actor_id: string;
  action: 'CONSENT_GRANT' | 'CONSENT_REVOKE' | 'DATA_FETCH' | 'WORKFLOW_EXECUTE' | 'IDENTITY_MATCH' | 'FORM_SUBMIT';
  department?: string;
  journey_id?: string;
  purpose: string;
  consent_jti?: string;
  payload_digest: string;
  metadata?: Record<string, any>;
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  actor_id: string;
  action: string;
  department?: string;
  journey_id?: string;
  purpose: string;
  consent_jti?: string;
  payload_digest: string;
  metadata?: Record<string, any>;
  prev_hash: string;
  block_hash: string;
}

export class HashChainLedger {
  private static instance: HashChainLedger;
  private blocks: AuditBlock[] = [];

  private constructor() {
    this.createGenesisBlock();
  }

  public static getInstance(): HashChainLedger {
    if (!HashChainLedger.instance) {
      HashChainLedger.instance = new HashChainLedger();
    }
    return HashChainLedger.instance;
  }

  private createGenesisBlock(): void {
    const genesisData: AuditBlock = {
      index: 0,
      timestamp: '2026-09-01T00:00:00.000Z',
      actor_id: 'SYSTEM_GENESIS',
      action: 'SYSTEM_INIT',
      purpose: 'MahaLink State Interoperability Genesis Node',
      payload_digest: 'GENESIS_PAYLOAD_DIGEST',
      prev_hash: '0'.repeat(64),
      block_hash: '',
    };
    genesisData.block_hash = this.calculateBlockHash(genesisData);
    this.blocks.push(genesisData);
  }

  private calculateBlockHash(block: Omit<AuditBlock, 'block_hash'>): string {
    const serialized = [
      block.index,
      block.timestamp,
      block.actor_id,
      block.action,
      block.department || 'GLOBAL',
      block.journey_id || 'NONE',
      block.purpose,
      block.consent_jti || 'NO_TOKEN',
      block.payload_digest,
      block.prev_hash,
    ].join('|');

    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  public append(data: AuditEntryData): AuditBlock {
    const prevBlock = this.blocks[this.blocks.length - 1];
    const newIndex = prevBlock.index + 1;
    const timestamp = new Date().toISOString();

    const blockDraft: Omit<AuditBlock, 'block_hash'> = {
      index: newIndex,
      timestamp,
      actor_id: data.actor_id,
      action: data.action,
      department: data.department,
      journey_id: data.journey_id,
      purpose: data.purpose,
      consent_jti: data.consent_jti,
      payload_digest: data.payload_digest,
      metadata: data.metadata,
      prev_hash: prevBlock.block_hash,
    };

    const block_hash = this.calculateBlockHash(blockDraft);
    const completedBlock: AuditBlock = { ...blockDraft, block_hash };

    this.blocks.push(completedBlock);
    return completedBlock;
  }

  public verifyChainIntegrity(): {
    isValid: boolean;
    totalBlocks: number;
    corruptedBlockIndex?: number;
    message: string;
  } {
    for (let i = 1; i < this.blocks.length; i++) {
      const current = this.blocks[i];
      const previous = this.blocks[i - 1];

      // 1. Verify previous hash pointer
      if (current.prev_hash !== previous.block_hash) {
        return {
          isValid: false,
          totalBlocks: this.blocks.length,
          corruptedBlockIndex: i,
          message: `Broken link at block #${i}: prev_hash does not match previous block_hash.`,
        };
      }

      // 2. Recompute and verify current block hash
      const recomputedHash = this.calculateBlockHash(current);
      if (current.block_hash !== recomputedHash) {
        return {
          isValid: false,
          totalBlocks: this.blocks.length,
          corruptedBlockIndex: i,
          message: `Tampered content at block #${i}: internal digest does not match block_hash.`,
        };
      }
    }

    return {
      isValid: true,
      totalBlocks: this.blocks.length,
      message: `Audit chain intact. Verified ${this.blocks.length} blocks with zero tampering detected.`,
    };
  }

  public getBlocks(limit: number = 50): AuditBlock[] {
    return this.blocks.slice(-limit).reverse();
  }

  public getBlockCount(): number {
    return this.blocks.length;
  }

  // Artificial tamper method for security demonstration testing
  public tamperBlockForTest(index: number, newDigest: string): void {
    if (this.blocks[index]) {
      this.blocks[index].payload_digest = newDigest;
    }
  }
}

export const auditLedger = HashChainLedger.getInstance();
