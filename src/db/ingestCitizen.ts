import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { EDUCATION_CSV_HEADERS } from '../adapters/educationAdapter';
import { env } from '../config/env';
import { aadhaarCheckDigit, hashIdentity, isValidAadhaar, maskAadhaar } from '../services/auth/identity';
import { insertCertificate, insertDrivingLicense, insertLandRecord, insertVehicle, withMongo, withMysql, withPg } from './seed';

// Live-ingestion demo (PRD F-20): a department clerk registers a new citizen in each department system.
// MahaLink stores nothing; it finds these rows just-in-time when the citizen signs in with the same Aadhaar.
//   npm run demo:ingest -- --name "Kavita Suresh More" --name-mr "मोरे कविता सुरेश" --district Pune
const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    'name-mr': { type: 'string' },
    district: { type: 'string', default: 'Pune' },
    aadhaar: { type: 'string' },
    income: { type: 'string', default: '250000' },
  },
});

if (!values.name || values.name.trim().split(/\s+/).length < 2) {
  console.error('Usage: --name "First Middle Last" [--name-mr "मराठी नाव"] [--district Pune] [--aadhaar 12-digits] [--income 250000]');
  process.exit(1);
}

const rand = (min: number, max: number) => crypto.randomInt(min, max + 1);
const digits = (n: number) => Array.from({ length: n }, () => rand(0, 9)).join('');

function syntheticAadhaar(): string {
  const first11 = `${rand(2, 9)}${digits(10)}`;
  return `${first11}${aadhaarCheckDigit(first11)}`;
}

const aadhaar = (values.aadhaar || syntheticAadhaar()).replace(/\D/g, '');
if (!isValidAadhaar(aadhaar)) {
  console.error('Invalid Aadhaar: needs 12 digits, first digit 2-9, valid Verhoeff checksum. Omit --aadhaar to generate one.');
  process.exit(1);
}

const name = values.name.trim();
const parts = name.split(/\s+/);
const first = parts[0];
const last = parts[parts.length - 1];
const middleInitial = parts.length > 2 ? `${parts[1][0]}.` : '';
const hash = hashIdentity(aadhaar, 'aadhaar');
const district = values.district!;
const year = new Date().getFullYear();

async function main() {
  const steps: Array<[string, () => Promise<unknown>]> = [
    [
      'Revenue 7/12 (PostgreSQL)',
      () =>
        withPg((c) =>
          insertLandRecord(c, {
            survey_number: `${rand(1, 499)}/${rand(1, 9)}`, sub_division: String(rand(1, 9)), district, taluka: district,
            village: 'Live Ingest Demo', owner_name_marathi: values['name-mr'] || name, owner_name_english: name, aadhaar_hash: hash,
            land_area_hectares: rand(20, 400) / 100, assessment_tax_inr: rand(500, 4000), unirrigated_area_hectares: 0,
            irrigated_area_hectares: 0, encumbrances: 'NIL', last_mutation_no: `MUT-${year}-${digits(4)}`,
            last_mutation_date: new Date().toISOString().slice(0, 10),
          })
        ),
    ],
    [
      'Sarathi DL + Vahan RC (MySQL)',
      () =>
        withMysql(async (c) => {
          // Abbreviated middle name on purpose: the identity resolver has to reconcile it.
          await insertDrivingLicense(c, {
            dl_number: `MH12-${year}${digits(7)}`, aadhaar_hash: hash, holder_name: [first, middleInitial, last].filter(Boolean).join(' '),
            date_of_birth: '1996-05-20', issue_date: `${year}-01-15`, expiry_date: `${year + 20}-01-14`,
            vehicle_classes: 'MCWG, LMV', rto_code: 'MH-12', blood_group: 'O+', status: 'ACTIVE',
          });
          await insertVehicle(c, {
            registration_number: `MH-12-LV-${digits(4)}`, aadhaar_hash: hash, owner_name: name, vehicle_make_model: 'Maruti Suzuki Swift',
            chassis_number: `MA3${crypto.randomBytes(7).toString('hex').toUpperCase()}`, fuel_type: 'PETROL', commercial_flag: false,
            fitness_validity: `${year + 15}-01-14`, insurance_validity: `${year + 1}-01-14`, pucc_validity: `${year + 1}-01-14`,
          });
        }),
    ],
    [
      'Income certificate (MongoDB)',
      () =>
        withMongo((db) =>
          insertCertificate(db, {
            certificate_id: `MH-INC-${year}-${digits(6)}`, aadhaar_hash: hash, certificate_type: 'INCOME_CERTIFICATE',
            applicant_details: { full_name_english: name, full_name_marathi: values['name-mr'] || name, district, pincode: '411001' },
            financial_assessment: {
              annual_income_inr: Number(values.income), assessment_year: `${year}-${year + 1}`,
              issuing_authority: `Tahsildar ${district}`, valid_until: `${year + 3}-03-31`,
            },
            status: 'APPROVED',
          })
        ),
    ],
    [
      'HSC marksheet (legacy CSV)',
      async () => {
        const file = path.resolve(env.CSV_DATA_DIR, 'education_marksheets_ingested.csv');
        if (!fs.existsSync(file)) fs.writeFileSync(file, `${EDUCATION_CSV_HEADERS.join(',')}\n`);
        const marks = rand(390, 620);
        const row = [`MH-HSC-${year - 1}-${digits(4)}`, hash, `${first} ${last}`,
          'Maharashtra State Board of Secondary and Higher Secondary Education', year - 1, marks, 650, ((marks / 650) * 100).toFixed(2),
          marks >= 487 ? 'A+' : 'A', 'INST-LIVE-001'];
        fs.appendFileSync(file, `${row.join(',')}\n`);
      },
    ],
  ];

  for (const [label, step] of steps) {
    try {
      await step();
      console.log(`[PASS] ${label}`);
    } catch (err: any) {
      console.log(`[FAIL] ${label}: ${err.message}`);
    }
  }

  console.log(`\nSign in with "Custom citizen" on the demo login:\n  Name:    ${name}\n  Aadhaar: ${aadhaar}  (${maskAadhaar(aadhaar)}, synthetic test number)`);
}

main();
