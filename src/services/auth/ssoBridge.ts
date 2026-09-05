import crypto from 'crypto';
import { Request, Response } from 'express';
import { signAuthToken } from './jwt';

// Pre-seeded demo citizen profiles matching our deterministic seed database
export const DEMO_PERSONAS = [
  {
    id: 'P-01',
    full_name: 'Priya Ramesh Sharma',
    aadhaar_raw: '9988-1234-5678',
    aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mobile: '+91 98230 11223',
    district: 'Pune',
    role: 'CITIZEN' as const,
  },
  {
    id: 'P-02',
    full_name: 'Rajesh Ganpat Pawar',
    aadhaar_raw: '8877-2345-6789',
    aadhaar_hash: '9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619',
    mobile: '+91 94220 33445',
    district: 'Baramati',
    role: 'CITIZEN' as const,
  },
  {
    id: 'P-03',
    full_name: 'Ananya Vijay Deshmukh',
    aadhaar_raw: '7766-3456-7890',
    aadhaar_hash: 'a81b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    mobile: '+91 98221 55667',
    district: 'Nashik',
    role: 'CITIZEN' as const,
  },
  {
    id: 'ADMIN-01',
    full_name: 'Dr. Sanjay Kolhe (Maha-IT Lead)',
    aadhaar_raw: '1122-3344-5566',
    aadhaar_hash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    mobile: '+91 99000 11111',
    district: 'Mumbai',
    role: 'SYS_ADMIN' as const,
  },
];

export interface CitizenProfile {
  id: string;
  full_name: string;
  aadhaar_raw: string;
  aadhaar_hash: string;
  mobile?: string;
  district?: string;
  role: 'CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN';
}

export const CUSTOM_CITIZEN_REGISTRY = new Map<string, CitizenProfile>();

export function getCitizenByHash(aadhaarHash: string): CitizenProfile | undefined {
  const staticFound = DEMO_PERSONAS.find((p) => p.aadhaar_hash === aadhaarHash);
  if (staticFound) return staticFound;
  return CUSTOM_CITIZEN_REGISTRY.get(aadhaarHash);
}

export function hashAadhaar(rawAadhaar: string): string {
  // Deterministic salt for test demonstration
  return crypto.createHash('sha256').update(rawAadhaar.replace(/[^0-9]/g, '') + '_mahalink_salt_2026').digest('hex');
}

export function handleSSOLogin(req: Request, res: Response) {
  const { persona_id, custom_name, custom_aadhaar, district, role } = req.body;

  let selectedPersona: CitizenProfile;

  if (persona_id) {
    const found = DEMO_PERSONAS.find((p) => p.id === persona_id);
    if (!found) {
      return res.status(404).json({ error: 'PERSONA_NOT_FOUND', message: `Demo persona ${persona_id} not found.` });
    }
    selectedPersona = found;
  } else if (custom_aadhaar && custom_name) {
    const rawClean = custom_aadhaar.trim();
    const computedHash = hashAadhaar(rawClean);
    selectedPersona = {
      id: `CUSTOM-${computedHash.slice(0, 6).toUpperCase()}`,
      full_name: custom_name.trim(),
      aadhaar_raw: rawClean.length === 12 ? `${rawClean.slice(0, 4)}-${rawClean.slice(4, 8)}-${rawClean.slice(8, 12)}` : rawClean,
      aadhaar_hash: computedHash,
      district: district || 'Pune',
      role: role || 'CITIZEN',
    };
    CUSTOM_CITIZEN_REGISTRY.set(computedHash, selectedPersona);
  } else {
    // Default to Persona 1 (Priya Sharma) in demo mode
    selectedPersona = DEMO_PERSONAS[0];
  }

  const token = signAuthToken({
    citizen_hash: selectedPersona.aadhaar_hash,
    full_name: selectedPersona.full_name,
    role: selectedPersona.role,
  });

  return res.status(200).json({
    status: 'AUTHENTICATED',
    auth_provider: 'Meri Pehchaan (National SSO Bridge)',
    token,
    user: {
      id: selectedPersona.id,
      full_name: selectedPersona.full_name,
      aadhaar_hash: selectedPersona.aadhaar_hash,
      masked_aadhaar: `XXXX-XXXX-${selectedPersona.aadhaar_raw.slice(-4)}`,
      role: selectedPersona.role,
      district: selectedPersona.district || 'Maharashtra',
    },
  });
}

