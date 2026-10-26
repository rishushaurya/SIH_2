import type { RawDepartmentRecord } from '../../adapters/types';

export interface NormalizedMGASPayload {
  citizen_profile: {
    full_name_english: string;
    full_name_marathi?: string;
    aadhaar_hash: string;
  };
  revenue_land_records?: {
    survey_number: string;
    sub_division: string;
    location: { district: string; taluka: string; village: string };
    land_area_hectares: number;
    annual_assessment_tax_inr: number;
    encumbrances: string;
    last_mutation_no: string;
  };
  verified_address?: { district: string; taluka: string; village: string };
  transport_records?: {
    driving_license?: {
      dl_number: string;
      holder_name: string;
      valid_until: string;
      authorized_classes: string;
      rto_code: string;
      status: string;
    };
    registered_vehicles?: Array<{ registration_number: string; make_model: string; fuel_type: string; fitness_validity: string }>;
  };
  certificate_records?: {
    income_certificate?: { certificate_id: string; annual_income_inr: number; issuing_authority: string; valid_until: string };
    caste_certificate?: { certificate_id: string; caste_category: string; sub_caste?: string; issuing_authority: string };
  };
  education_records?: {
    student_roll_no: string;
    board_name: string;
    passing_year: number;
    percentage: number;
    grade: string;
  };
  verification_summary: {
    sources_verified: string[];
    resolution_confidence_average: number;
    normalization_timestamp: string;
  };
}

const findCert = (data: any, key: 'financial_assessment' | 'caste_details') =>
  (data?.certificates as any[] | undefined)?.find((c) => c.status !== 'REJECTED' && c[key]);

// Name each department holds for this citizen, used by the identity resolver.
export function departmentName(department: string, data: any): string | undefined {
  switch (department) {
    case 'revenue':
      return data.owner_name_marathi || data.owner_name_english;
    case 'rto':
      return data.driving_license?.holder_name ?? data.vehicles?.[0]?.owner_name;
    case 'certificates':
      return data.certificates?.[0]?.applicant_details?.full_name_english;
    case 'education':
      return data.candidate_name_en;
    default:
      return undefined;
  }
}

// Maps department records to MGAS, emitting only sections the consent scope covers (purpose limitation).
export class MGASNormalizer {
  public static normalize(
    primaryCitizen: { full_name: string; aadhaar_hash: string },
    raw: Record<string, RawDepartmentRecord>,
    scope: string[]
  ): NormalizedMGASPayload {
    const has = (s: string) => scope.includes(s);
    const sources = new Set<string>();
    const mgas: NormalizedMGASPayload = {
      citizen_profile: { full_name_english: primaryCitizen.full_name, aadhaar_hash: primaryCitizen.aadhaar_hash },
      verification_summary: { sources_verified: [], resolution_confidence_average: 0, normalization_timestamp: new Date().toISOString() },
    };

    const rev = raw.revenue?.data;
    if (rev && (has('revenue:7_12:read') || has('revenue:residence_address:read'))) {
      if (rev.owner_name_marathi) mgas.citizen_profile.full_name_marathi = rev.owner_name_marathi;
      const location = { district: rev.district, taluka: rev.taluka, village: rev.village };
      if (has('revenue:7_12:read')) {
        mgas.revenue_land_records = {
          survey_number: rev.survey_number,
          sub_division: rev.sub_division,
          location,
          land_area_hectares: parseFloat(rev.land_area_hectares),
          annual_assessment_tax_inr: parseFloat(rev.assessment_tax_inr),
          encumbrances: rev.encumbrances || 'NIL',
          last_mutation_no: rev.last_mutation_no,
        };
      }
      if (has('revenue:residence_address:read')) mgas.verified_address = location;
      sources.add('Revenue Department (Mahabhumi 7/12)');
    }

    const rto = raw.rto?.data;
    if (rto) {
      const transport: NonNullable<NormalizedMGASPayload['transport_records']> = {};
      if (has('rto:driving_license:read') && rto.driving_license) {
        const dl = rto.driving_license;
        transport.driving_license = {
          dl_number: dl.dl_number,
          holder_name: dl.holder_name,
          valid_until: dl.expiry_date,
          authorized_classes: dl.vehicle_classes,
          rto_code: dl.rto_code,
          status: dl.status,
        };
      }
      if (has('rto:vehicle_rc:read')) {
        transport.registered_vehicles = (rto.vehicles || []).map((v: any) => ({
          registration_number: v.registration_number,
          make_model: v.vehicle_make_model,
          fuel_type: v.fuel_type,
          fitness_validity: v.fitness_validity,
        }));
      }
      if (Object.keys(transport).length) {
        mgas.transport_records = transport;
        sources.add('Transport Department (Sarathi & Vahan)');
      }
    }

    const certs = raw.certificates?.data;
    if (certs) {
      const records: NonNullable<NormalizedMGASPayload['certificate_records']> = {};
      const income = findCert(certs, 'financial_assessment');
      if (has('certificates:historical_income:read') && income) {
        records.income_certificate = {
          certificate_id: income.certificate_id,
          annual_income_inr: Number(income.financial_assessment.annual_income_inr),
          issuing_authority: income.financial_assessment.issuing_authority,
          valid_until: income.financial_assessment.valid_until,
        };
      }
      const caste = findCert(certs, 'caste_details');
      if (has('certificates:caste_certificate:read') && caste) {
        records.caste_certificate = {
          certificate_id: caste.certificate_id,
          caste_category: caste.caste_details.caste_category,
          sub_caste: caste.caste_details.sub_caste,
          issuing_authority: caste.caste_details.issuing_authority,
        };
      }
      if (Object.keys(records).length) {
        mgas.certificate_records = records;
        sources.add('Certificate Services (e-District MahaOnline)');
      }
    }

    const edu = raw.education?.data;
    if (edu && has('education:marksheet:read')) {
      mgas.education_records = {
        student_roll_no: edu.student_roll_no,
        board_name: edu.board_name,
        passing_year: edu.passing_year,
        percentage: edu.percentage,
        grade: edu.grade,
      };
      sources.add('Education Board (Legacy Records Stream)');
    }

    mgas.verification_summary.sources_verified = [...sources];
    return mgas;
  }
}
