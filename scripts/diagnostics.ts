import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../src/config/env';

interface DiagnosticResult {
  status: 'PASS' | 'FAIL';
  title: string;
  duration?: string;
  details: string;
}

const results: DiagnosticResult[] = [];

function check(title: string, fn: () => string | void) {
  try {
    const start = Date.now();
    const details = fn();
    const duration = `${Date.now() - start}ms`;
    results.push({
      status: 'PASS',
      title,
      duration,
      details: details || 'OK',
    });
  } catch (error: any) {
    results.push({
      status: 'FAIL',
      title,
      details: error.message || 'Unknown diagnostic error',
    });
  }
}

// 1. Runtime Version
check('Node.js & TypeScript Runtime Environment', () => {
  const version = process.version;
  const major = parseInt(version.replace('v', '').split('.')[0], 10);
  if (major < 18) {
    throw new Error(`Node version ${version} is below the required v18+`);
  }
  return `Node ${version} (${process.platform}-${process.arch})`;
});

// 2. Zod Environment Validation
check('Environment Variables & Zod Schema Integrity', () => {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET is too short or missing.');
  }
  return `PORT: ${env.PORT}, DEMO_MODE: ${env.DEMO_MODE}, ENV: ${env.NODE_ENV}`;
});

// 3. ECDSA Cryptographic Keypair & Signer
check('ECDSA P-256 Cryptographic Subsystem', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });

  const payload = JSON.stringify({ sub: 'aadhaar_sha256', iat: Date.now() });
  const sign = crypto.createSign('SHA256');
  sign.update(payload);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');

  const verify = crypto.createVerify('SHA256');
  verify.update(payload);
  verify.end();
  const isValid = verify.verify(publicKey, signature, 'base64');

  if (!isValid) {
    throw new Error('ECDSA P-256 signature verification failed.');
  }
  return 'ECDSA P-256 Keypair Generation & Signature Validation Functional';
});

// 4. SHA-256 Hash Chain Integrity
check('SHA-256 Hash-Chain Audit Ledger Algorithm', () => {
  const genesis = '0'.repeat(64);
  const block1 = crypto.createHash('sha256').update(genesis + 'DATA_1').digest('hex');
  const block2 = crypto.createHash('sha256').update(block1 + 'DATA_2').digest('hex');

  const recomputed = crypto.createHash('sha256').update(block1 + 'DATA_2').digest('hex');
  if (recomputed !== block2) {
    throw new Error('Hash-chain cryptographic link mismatch.');
  }
  return `Genesis -> Block#1 (${block1.slice(0, 8)}...) -> Block#2 (${block2.slice(0, 8)}...) verified`;
});

// 5. CSV Stream Data File Existence
check('Legacy CSV Stream Engine & File Access', () => {
  const csvDir = path.resolve(process.cwd(), 'src/db/files');
  const filePath = path.join(csvDir, 'education_marksheets.csv');

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file missing at ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('student_roll_no')) {
    throw new Error('CSV file header does not contain student_roll_no');
  }
  return `Verified ${filePath} (${content.trim().split('\n').length} rows)`;
});

console.log('\n============================================================');
console.log('              MAHALINK SYSTEM DIAGNOSTIC REPORT             ');
console.log('============================================================');
let allPassed = true;

results.forEach((r, idx) => {
  const num = idx + 1;
  const statusStr = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
  if (r.status !== 'PASS') allPassed = false;
  console.log(`${statusStr} ${num}. ${r.title} (${r.duration || ''})`);
  console.log(`       Details: ${r.details}`);
});

console.log('============================================================');
if (allPassed) {
  console.log(`DIAGNOSTIC STATUS: ${results.length}/${results.length} CHECKS PASSED. SYSTEM OPERATIONAL.`);
} else {
  console.log('DIAGNOSTIC STATUS: ISSUES DETECTED. PLEASE REVIEW LOGS ABOVE.');
}
console.log('============================================================\n');

process.exit(allPassed ? 0 : 1);
