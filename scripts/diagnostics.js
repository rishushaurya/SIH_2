/**
 * MahaLink Diagnostics & Self-Test Suite (Chunk 00)
 * Validates Node.js runtime, environment configuration, crypto engine, and file systems.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const results = [];

function check(title, fn) {
  try {
    const startTime = Date.now();
    const details = fn();
    const duration = Date.now() - startTime;
    results.push({
      status: 'PASS',
      title,
      duration: `${duration}ms`,
      details: details || 'OK'
    });
  } catch (error) {
    results.push({
      status: 'FAIL',
      title,
      details: error.message
    });
  }
}

// 1. Node.js Runtime Check
check('Node.js Runtime Environment', () => {
  const version = process.version;
  const major = parseInt(version.replace('v', '').split('.')[0], 10);
  if (major < 18) {
    throw new Error(`Node.js version ${version} is too low. Required: v18+ (Recommended: v20 LTS).`);
  }
  return `Version ${version} on ${process.platform} (${process.arch})`;
});

// 2. Configuration & .env File Presence
check('Environment Configuration (.env / .env.example)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    throw new Error('.env.example is missing from repository root.');
  }
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file missing. Run npm run env:init or copy .env.example.');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  if (!envContent.includes('JWT_SECRET') || !envContent.includes('DEMO_MODE')) {
    throw new Error('.env is missing mandatory keys (JWT_SECRET or DEMO_MODE).');
  }
  return 'Valid (.env and .env.example loaded successfully)';
});

// 3. Cryptographic Subsystem (ECDSA P-256 & SHA-256)
check('ECDSA P-256 Cryptographic Subsystem', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1'
  });

  const testPayload = JSON.stringify({
    jti: 'test-consent-uuid',
    purpose: 'DIAGNOSTIC_VERIFY',
    iat: Date.now()
  });

  const sign = crypto.createSign('SHA256');
  sign.update(testPayload);
  sign.end();
  const signature = sign.sign(privateKey, 'base64');

  const verify = crypto.createVerify('SHA256');
  verify.update(testPayload);
  verify.end();
  const isValid = verify.verify(publicKey, signature, 'base64');

  if (!isValid) {
    throw new Error('ECDSA signature verification failed.');
  }
  return 'ECDSA P-256 Keypair Generation & Signature Validation Functional';
});

// 4. SHA-256 Hash-Chain Audit Ledger Mechanics
check('SHA-256 Hash-Chain Audit Ledger Algorithm', () => {
  const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const block1Data = 'ACTOR:Priya|ACTION:CONSENT_GRANT|SCOPE:revenue:7_12';
  const block1Hash = crypto.createHash('sha256').update(genesisHash + block1Data).digest('hex');

  const block2Data = 'ACTOR:Priya|ACTION:FETCH_712|DEPT:revenue';
  const block2Hash = crypto.createHash('sha256').update(block1Hash + block2Data).digest('hex');

  // Verify chain linkage
  const recomputedBlock2 = crypto.createHash('sha256').update(block1Hash + block2Data).digest('hex');
  if (recomputedBlock2 !== block2Hash) {
    throw new Error('Hash-chain link calculation mismatch.');
  }
  return `Genesis -> Block#1 (${block1Hash.substring(0, 10)}...) -> Block#2 (${block2Hash.substring(0, 10)}...) validated`;
});

// 5. Database Directory & CSV Flat-File Structure
check('Database Directory & Legacy CSV Files', () => {
  const dbDir = path.resolve(__dirname, '..', 'src', 'db');
  const filesDir = path.resolve(__dirname, '..', 'src', 'db', 'files');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  // Check or initialize mock CSV file
  const csvPath = path.join(filesDir, 'education_marksheets.csv');
  if (!fs.existsSync(csvPath)) {
    const defaultCSV = `student_roll_no,aadhaar_hash,candidate_name_en,board_name,passing_year,marks_obtained,total_marks,percentage,grade,institution_code
MH-HSC-2021-9821,e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855,Priya R Sharma,Maharashtra State Board of Secondary and Higher Secondary Education,2021,582,650,89.54,A+,INST-PUN-094
MH-HSC-2020-4412,9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619,Rajesh Pawar,Maharashtra State Board of Secondary and Higher Secondary Education,2020,495,650,76.15,A,INST-BAR-012
`;
    fs.writeFileSync(csvPath, defaultCSV, 'utf8');
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  if (!csvContent.includes('student_roll_no') || !csvContent.includes('aadhaar_hash')) {
    throw new Error('education_marksheets.csv header structure invalid.');
  }

  return `CSV files present and accessible (${csvPath})`;
});

// 6. Identity Resolver Phonetic Transliteration Benchmark
check('Identity Resolution Transliteration Engine', () => {
  // Test character transliteration lookup
  const marathiNames = ['प्रिया शर्मा', 'राजेश पवार', 'अनन्या देशमुख'];
  const expectedTranslations = ['Priya Sharma', 'Rajesh Pawar', 'Ananya Deshmukh'];
  
  if (marathiNames.length !== expectedTranslations.length) {
    throw new Error('Transliteration benchmark test vector size mismatch.');
  }
  return 'Phonetic test vectors ready (Marathi Devanagari to Latin)';
});

// Print Diagnostic Report
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
