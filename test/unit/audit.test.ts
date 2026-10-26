import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { HashChainLedger } from '../../src/services/audit/hashChain';

const entry = (digest: string) => ({ actor_id: 'a'.repeat(64), action: 'DATA_FETCH' as const, purpose: 'Test fetch', payload_digest: digest });

describe('SHA-256 Hash-Chain Audit Ledger', () => {
  it('starts with a verified genesis block and links appended blocks', () => {
    const ledger = new HashChainLedger();
    const block = ledger.append(entry('digest_1'));
    expect(block.index).toBe(1);
    expect(block.prev_hash).toBe(ledger.allBlocks()[0].block_hash);
    expect(ledger.verifyChainIntegrity().isValid).toBe(true);
  });

  it('detects tampering of a block payload', () => {
    const ledger = new HashChainLedger();
    const block = ledger.append(entry('ORIGINAL'));
    ledger.tamperBlockForTest(block.index, 'MALICIOUS');
    const check = ledger.verifyChainIntegrity();
    expect(check.isValid).toBe(false);
    expect(check.corruptedBlockIndex).toBe(block.index);
    expect(check.message).toContain('Tampered content');
  });

  it('covers metadata with the hash (nested fields cannot be edited silently)', () => {
    const ledger = new HashChainLedger();
    const block = ledger.append({ ...entry('d'), metadata: { consent: { departments: ['revenue'] } } });
    (block.metadata!.consent as any).departments.push('rto');
    expect(ledger.verifyChainIntegrity().isValid).toBe(false);
  });

  it('persists to an append-only file and detects tampering of the file on reload', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mahalink-')), 'ledger.jsonl');
    const ledger = new HashChainLedger(file);
    ledger.append(entry('first'));
    ledger.append(entry('second'));

    const reloaded = new HashChainLedger(file);
    expect(reloaded.getBlockCount()).toBe(3);
    expect(reloaded.verifyChainIntegrity().isValid).toBe(true);

    // A rogue admin edits block #1 on disk.
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
    lines[1] = lines[1].replace('first', 'forged');
    fs.writeFileSync(file, `${lines.join('\n')}\n`);
    const check = new HashChainLedger(file).verifyChainIntegrity();
    expect(check.isValid).toBe(false);
    expect(check.corruptedBlockIndex).toBe(1);

    // Deleting a block breaks the chain as well.
    fs.writeFileSync(file, `${[lines[0], lines[2]].join('\n')}\n`);
    expect(new HashChainLedger(file).verifyChainIntegrity().isValid).toBe(false);
  });
});
