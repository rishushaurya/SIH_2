export interface NormalizedMGASPayload {
  citizen_profile: {
    full_name_english: string;
    full_name_marathi?: string;
    aadhaar_hash: string;
  };
  revenue_land_records?: {
    survey_number: string;
    sub_division: string;
    location: {
      district: string;
      taluka: string;
      village: string;
    };
    land_area_hectares: number;
    annual_assessment_tax_inr: number;
    encumbrances: string;
    last_mutation_no: string;
  };
  transport_records?: {
    driving_license?: {
      dl_number: string;
      holder_name: string;
      valid_until: string;
      authorized_classes: string;
      rto_code: string;
      status: string;
    };
    registered_vehicles: Array<{
      registration_number: string;
      make_model: string;
      fuel_type: string;
      chassis_number: string;
      fitness_validity: string;
    }>;
  };
  certificate_records?: {
    income_certificate?: {
      certificate_id: string;
      annual_income_inr: number;
      issuing_authority: string;
      valid_until: string;
    };
    caste_certificate?: {
      certificate_id: string;
      caste_category: string;
      sub_caste?: string;
      issuing_authority: string;
    };
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

export class MGASNormalizer {
  public static normalize(
    primaryCitizen: { full_name: string; aadhaar_hash: string },
    rawDepartmentData: Record<string, any>
  ): NormalizedMGASPayload {
    const sourcesVerified: string[] = [];

    const mgas: NormalizedMGASPayload = {
      citizen_profile: {
        full_name_english: primaryCitizen.full_name,
        aadhaar_hash: primaryCitizen.aadhaar_hash,
      },
      verification_summary: {
        sources_verified: sourcesVerified,
        resolution_confidence_average: 0.98,
        normalization_timestamp: new Date().toISOString(),
      },
    };

    // 1. Revenue Department Normalization
    if (rawDepartmentData.revenue?.data) {
      const r = rawDepartmentData.revenue.data;
      mgas.revenue_land_records = {
        survey_number: r.survey_number || 'N/A',
        sub_division: r.sub_division || '1',
        location: {
          district: r.district || 'Pune',
          taluka: r.taluka || 'Haveli',
          village: r.village || '',
        },
        land_area_hectares: parseFloat(r.land_area_hectares) || 0,
        annual_assessment_tax_inr: parseFloat(r.assessment_tax_inr) || 0,
        encumbrances: r.encumbrances || 'NIL',
        last_mutation_no: r.last_mutation_no || '',
      };
      if (r.owner_name_marathi) {
        mgas.citizen_profile.full_name_marathi = r.owner_name_marathi;
      }
      sourcesVerified.push('Revenue Department (Mahabhumi 7/12)');
    }

    // 2. RTO Transport Normalization
    if (rawDepartmentData.rto?.data) {
      const rto = rawDepartmentData.rto.data;
      mgas.transport_records = {
        driving_license: rto.driving_license
          ? {
              dl_number: rto.driving_license.dl_number,
              holder_name: rto.driving_license.holder_name,
              valid_until: rto.driving_license.expiry_date,
              authorized_classes: rto.driving_license.vehicle_classes,
              rto_code: rto.driving_license.rto_code,
              status: rto.driving_license.status,
            }
          : undefined,
        registered_vehicles: Array.isArray(rto.vehicles)
          ? rto.vehicles.map((v: any) => ({
              registration_number: v.registration_number,
              make_model: v.vehicle_make_model,
              fuel_type: v.fuel_type,
              chassis_number: v.chassis_number,
              fitness_validity: v.fitness_validity,
            }))
          : [],
      };
      sourcesVerified.push('Transport Department (Sarathi & Vahan)');
    }

    // 3. Certificates Normalization
    if (rawDepartmentData.certificates?.data) {
      const cert = rawDepartmentData.certificates.data;
      mgas.certificate_records = {};

      if (cert.certificate_type === 'INCOME_CERTIFICATE' && cert.financial_assessment) {
        mgas.certificate_records.income_certificate = {
          certificate_id: cert.certificate_id,
          annual_income_inr: cert.financial_assessment.annual_income_inr,
          issuing_authority: cert.financial_assessment.issuing_authority,
          valid_until: cert.financial_assessment.valid_until,
        };
      }

      if (cert.certificate_type === 'CASTE_CERTIFICATE' && cert.caste_details) {
        mgas.certificate_records.caste_certificate = {
          certificate_id: cert.certificate_id,
          caste_category: cert.caste_details.caste_category,
          sub_caste: cert.caste_details.sub_caste,
          issuing_authority: cert.caste_details.issuing_authority,
        };
      }

      sourcesVerified.push('Certificate Services (e-District MahaOnline)');
    }

    // 4. Education Legacy CSV Normalization
    if (rawDepartmentData.education?.data) {
      const edu = rawDepartmentData.education.data;
      mgas.education_records = {
        student_roll_no: edu.student_roll_no,
        board_name: edu.board_name,
        passing_year: edu.passing_year,
        percentage: edu.percentage,
        grade: edu.grade,
      };
      sourcesVerified.push('Education Board (Legacy Records Stream)');
    }

    return mgas;
  }
}
