import { auditLedger } from '../src/services/audit/hashChain';

function runTamperTest() {
  console.log('\n============================================================');
  console.log('       CRYPTOGRAPHIC HASH-CHAIN TAMPER DETECTION TEST       ');
  console.log('============================================================\n');

  // 1. Initial State Check
  const initialCheck = auditLedger.verifyChainIntegrity();
  console.log(`[INFO] Initial Hash-Chain Status: ${initialCheck.isValid ? 'VALID' : 'INVALID'}`);
  console.log(`       Blocks on Ledger: ${initialCheck.totalBlocks}`);

  // 2. Append genuine test block
  const block = auditLedger.append({
    actor_id: 'citizen_audit_test_hash',
    action: 'DATA_FETCH',
    purpose: 'Cryptographic Integrity Verification Test',
    payload_digest: 'GENUINE_712_DIGEST_HASH_abc123',
  });
  console.log(`[INFO] Mined Block #${block.index} -> Hash: ${block.block_hash.slice(0, 16)}...`);

  // 3. Artificially tamper with the ledger block
  console.log(`[ACTION] Artificially altering Block #${block.index} payload to 'MALICIOUS_TAMPERED_RECORD'...`);
  auditLedger.tamperBlockForTest(block.index, 'MALICIOUS_TAMPERED_RECORD');

  // 4. Run mathematical integrity verification
  const tamperCheck = auditLedger.verifyChainIntegrity();

  if (!tamperCheck.isValid && tamperCheck.corruptedBlockIndex === block.index) {
    console.log(`\n[PASS] FRAUD MATHEMATICALLY DETECTED!`);
    console.log(`       Corrupted Block Index: #${tamperCheck.corruptedBlockIndex}`);
    console.log(`       Diagnostic Message: ${tamperCheck.message}`);
  } else {
    console.error(`\n[FAIL] Tampering was not detected by hash-chain verifier!`);
    process.exit(1);
  }

  // 5. Restore block for clean state
  auditLedger.tamperBlockForTest(block.index, 'GENUINE_712_DIGEST_HASH_abc123');
  const restoredCheck = auditLedger.verifyChainIntegrity();
  console.log(`\n[INFO] Restored ledger block. Integrity status: ${restoredCheck.isValid ? 'VERIFIED INTACT' : 'STILL BROKEN'}`);
  console.log('============================================================\n');
}

runTamperTest();
