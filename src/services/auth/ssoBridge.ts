import { httpError } from '../../gateway/errorHandler';
import { hashIdentity, isValidAadhaar, maskAadhaar } from './identity';
import { Role, SessionUser } from './jwt';

// Demo-only identities (DEMO_MODE=true). Hashes anchor the seeded department records in src/db/fixtures.ts.
// Real citizens sign in through Meri Pehchaan (oidc.ts).
export const DEMO_PERSONAS: Array<{
  id: string;
  full_name: string;
  aadhaar_last4: string;
  aadhaar_hash: string;
  district: string;
  role: Role;
  department_id?: string;
  scenario: string;
}> = [
  {
    id: 'P-01',
    full_name: 'Priya Ramesh Sharma',
    aadhaar_last4: '5678',
    aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    district: 'Pune',
    role: 'CITIZEN',
    scenario: 'Devanagari vs English name, abbreviated middle name',
  },
  {
    id: 'P-02',
    full_name: 'Rajesh Ganpat Pawar',
    aadhaar_last4: '6789',
    aadhaar_hash: '9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619',
    district: 'Pune',
    role: 'CITIZEN',
    scenario: 'Surname-first Marathi record, OBC caste certificate',
  },
  {
    id: 'P-03',
    full_name: 'Ananya Vijay Deshmukh',
    aadhaar_last4: '7890',
    aadhaar_hash: 'a81b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    district: 'Nashik',
    role: 'CITIZEN',
    scenario: 'Scholarship: HSC marksheet + caste + family income',
  },
  {
    id: 'P-04',
    full_name: 'Sunil Baban Jadhav',
    aadhaar_last4: '9012',
    aadhaar_hash: 'b72c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
    district: 'Satara',
    role: 'CITIZEN',
    scenario: 'Expired driving licence, no board record (missing-document guidance)',
  },
  {
    id: 'DEPT-01',
    full_name: 'Smt. Meera Kulkarni (Revenue Desk Officer)',
    aadhaar_last4: '3344',
    aadhaar_hash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    district: 'Pune',
    role: 'DEPT_ADMIN',
    department_id: 'revenue',
    scenario: 'Department officer: sees only Revenue audit entries',
  },
  {
    id: 'ADMIN-01',
    full_name: 'Dr. Sanjay Kolhe (Maha-IT Lead)',
    aadhaar_last4: '5566',
    aadhaar_hash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    district: 'Mumbai',
    role: 'SYS_ADMIN',
    scenario: 'State Data Authority: full audit ledger and export',
  },
];

export const publicPersonas = () =>
  DEMO_PERSONAS.map(({ aadhaar_hash: _hash, aadhaar_last4, ...p }) => ({ ...p, masked_id: `XXXX-XXXX-${aadhaar_last4}` }));

export function demoLogin(input: { persona_id?: string; full_name?: string; aadhaar?: string }): SessionUser {
  if (input.persona_id) {
    const persona = DEMO_PERSONAS.find((p) => p.id === input.persona_id);
    if (!persona) throw httpError(404, 'PERSONA_NOT_FOUND', `Demo persona ${input.persona_id} not found.`);
    return {
      citizen_hash: persona.aadhaar_hash,
      full_name: persona.full_name,
      role: persona.role,
      department_id: persona.department_id,
      masked_id: `XXXX-XXXX-${persona.aadhaar_last4}`,
      auth_provider: 'Demo SSO (DEMO_MODE)',
    };
  }

  const aadhaar = (input.aadhaar || '').replace(/\D/g, '');
  if (!isValidAadhaar(aadhaar)) {
    throw httpError(400, 'INVALID_AADHAAR', 'Aadhaar must be 12 digits, not start with 0 or 1, and pass the Verhoeff checksum.');
  }
  // Custom demo logins are always citizens; roles can never be self-assigned.
  return {
    citizen_hash: hashIdentity(aadhaar, 'aadhaar'),
    full_name: input.full_name!.trim(),
    role: 'CITIZEN',
    masked_id: maskAadhaar(aadhaar),
    auth_provider: 'Demo SSO (DEMO_MODE)',
  };
}
