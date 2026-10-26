import fs from 'fs';
import os from 'os';
import path from 'path';
import { env } from '../src/config/env';
import { HashChainLedger } from '../src/services/audit/hashChain';

// Live tamper demonstration on a COPY of the real ledger file — the production ledger is never touched.
// Plays the "rogue administrator" from the judge Q&A: edit one historical block on disk, then re-verify.
const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mahalink-tamper-')), 'audit-ledger.jsonl');
if (env.AUDIT_LOG_PATH && fs.existsSync(env.AUDIT_LOG_PATH)) fs.copyFileSync(env.AUDIT_LOG_PATH, copy);

const ledger = new HashChainLedger(copy);
if (ledger.getBlockCount() < 3) {
  for (const digest of ['DEMO_FETCH_7_12', 'DEMO_FETCH_RC']) {
    ledger.append({ actor_id: 'f'.repeat(64), action: 'DATA_FETCH', department: 'revenue', purpose: 'Tamper demo', payload_digest: digest });
  }
}

const before = ledger.verifyChainIntegrity();
console.log(`[1] Ledger copy: ${copy}`);
console.log(`    ${before.message}`);

const lines = fs.readFileSync(copy, 'utf8').trim().split('\n');
const target = Math.max(1, Math.floor(lines.length / 2));
const block = JSON.parse(lines[target]);
console.log(`[2] Rogue admin edits block #${block.index} on disk (${block.action}, purpose "${block.purpose}")`);
block.purpose = 'Routine maintenance';
lines[target] = JSON.stringify(block);
fs.writeFileSync(copy, `${lines.join('\n')}\n`);

const after = new HashChainLedger(copy).verifyChainIntegrity();
console.log(`[3] Re-verification after restart: ${after.message}`);
if (after.isValid || after.corruptedBlockIndex !== block.index) {
  console.error('[FAIL] Tampering was NOT detected.');
  process.exit(1);
}
console.log(`[PASS] Tampering detected at block #${after.corruptedBlockIndex}. The gateway refuses to start on such a ledger.`);
