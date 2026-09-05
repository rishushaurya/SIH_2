import { describe, expect, it } from 'vitest';
import { HashChainLedger } from '../../src/services/audit/hashChain';

describe('SHA-256 Hash-Chain Audit Ledger', () => {
  it('should initialize with a verified genesis block', () => {
    const ledger = HashChainLedger.getInstance();
    expect(ledger.getBlockCount()).toBeGreaterThanOrEqual(1);

    const check = ledger.verifyChainIntegrity();
    expect(check.isValid).toBe(true);
    expect(check.message).toContain('Audit chain intact');
  });

  it('should append valid linked blocks', () => {
    const ledger = HashChainLedger.getInstance();
    const initialCount = ledger.getBlockCount();

    const block1 = ledger.append({
      actor_id: 'citizen_123',
      action: 'CONSENT_GRANT',
      purpose: 'Income Cert Verification',
      payload_digest: 'digest_1',
    });

    expect(block1.index).toBe(initialCount);
    expect(block1.prev_hash.length).toBe(64);
    expect(block1.block_hash.length).toBe(64);

    const check = ledger.verifyChainIntegrity();
    expect(check.isValid).toBe(true);
  });

  it('should detect artificial tampering with block payload', () => {
    const ledger = HashChainLedger.getInstance();
    const testBlock = ledger.append({
      actor_id: 'citizen_456',
      action: 'DATA_FETCH',
      purpose: '7/12 Land Record Fetch',
      payload_digest: 'ORIGINAL_RECORD_HASH',
    });

    // Verify before tampering
    expect(ledger.verifyChainIntegrity().isValid).toBe(true);

    // Artificially tamper with the payload digest
    ledger.tamperBlockForTest(testBlock.index, 'MALICIOUS_TAMPERED_DIGEST');

    // Verification must fail!
    const checkAfterTamper = ledger.verifyChainIntegrity();
    expect(checkAfterTamper.isValid).toBe(false);
    expect(checkAfterTamper.corruptedBlockIndex).toBe(testBlock.index);
    expect(checkAfterTamper.message).toContain('Tampered content');

    // Restore for subsequent test isolation
    ledger.tamperBlockForTest(testBlock.index, 'ORIGINAL_RECORD_HASH');
  });
});
