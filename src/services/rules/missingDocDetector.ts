import type { NormalizedMGASPayload } from '../normalizer/mgasNormalizer';

export type DepartmentStatus = 'VERIFIED' | 'VERIFICATION_REQUIRED' | 'IDENTITY_MISMATCH' | 'NOT_FOUND' | 'UNAVAILABLE';

export interface MissingDocumentAlert {
  department: string;
  reason: 'NOT_FOUND' | 'UNAVAILABLE' | 'IDENTITY_MISMATCH' | 'EXPIRED';
  missing_record_type: string;
  severity: 'WARNING' | 'CRITICAL';
  citizen_guidance_en: string;
  citizen_guidance_mr: string;
  portal_url: string;
}

const RECORDS: Record<string, { type: string; url: string; en: string; mr: string }> = {
  revenue: {
    type: '7/12 Land Record Extract',
    url: 'https://bhulekh.mahabhumi.gov.in',
    en: 'No 7/12 record is linked to your Aadhaar. If you do not own land, attach an employer salary slip or municipal tax receipt.',
    mr: 'आपल्या आधार क्रमांकावर ७/१२ नोंद आढळली नाही. जमीन नसल्यास कृपया पगार पावती किंवा नगरपरिषद कर पावती जोडावी.',
  },
  rto: {
    type: 'Driving Licence / Vehicle Registration',
    url: 'https://parivahan.gov.in',
    en: 'No Sarathi/Vahan record is linked to your Aadhaar. Enter the details manually or link Aadhaar on parivahan.gov.in.',
    mr: 'आपल्या आधारशी सारथी/वाहन नोंद जोडलेली नाही. तपशील स्वतः भरा किंवा parivahan.gov.in वर आधार जोडा.',
  },
  certificates: {
    type: 'Caste / Income Certificate',
    url: 'https://aaplesarkar.mahaonline.gov.in',
    en: 'Caste or Income Certificate not found in the e-District registry. Please apply on Aaple Sarkar first.',
    mr: 'ई-डिस्ट्रिक्ट नोंदणीत जात किंवा उत्पन्न प्रमाणपत्र आढळले नाही. कृपया प्रथम आपले सरकारवर अर्ज करावा.',
  },
  education: {
    type: 'HSC Board Marksheet',
    url: 'https://mahahsscboard.in',
    en: 'No board marksheet is linked to your Aadhaar. Upload a self-attested copy of your marksheet.',
    mr: 'आपल्या आधारशी बोर्ड गुणपत्रिका जोडलेली नाही. स्वसाक्षांकित गुणपत्रिकेची प्रत अपलोड करा.',
  },
};

const STATUS_GUIDANCE: Partial<Record<DepartmentStatus, { en: string; mr: string }>> = {
  UNAVAILABLE: {
    en: 'The department system did not respond in time. Fill this section manually; the department officer will verify it.',
    mr: 'विभागाची प्रणाली वेळेत प्रतिसाद देऊ शकली नाही. हा विभाग स्वतः भरा; विभागीय अधिकारी पडताळणी करतील.',
  },
  IDENTITY_MISMATCH: {
    en: 'A record was found but the name differs too much to be matched safely, so it was not used. Request a correction at the issuing office (DPDP Act 2023 s.12).',
    mr: 'नोंद आढळली परंतु नाव जुळत नसल्याने ती वापरली नाही. संबंधित कार्यालयात दुरुस्तीची विनंती करा (DPDP कायदा २०२३, कलम १२).',
  },
};

export class MissingDocDetector {
  public static evaluate(
    journeyId: string,
    statuses: Record<string, DepartmentStatus>,
    mgas: NormalizedMGASPayload,
    today = new Date().toISOString().slice(0, 10)
  ): MissingDocumentAlert[] {
    const alerts: MissingDocumentAlert[] = [];

    for (const [department, status] of Object.entries(statuses)) {
      const record = RECORDS[department];
      if (!record || status === 'VERIFIED' || status === 'VERIFICATION_REQUIRED') continue;
      const guidance = status === 'NOT_FOUND' ? record : STATUS_GUIDANCE[status]!;
      alerts.push({
        department,
        reason: status,
        missing_record_type: record.type,
        severity: 'WARNING',
        citizen_guidance_en: guidance.en,
        citizen_guidance_mr: guidance.mr,
        portal_url: record.url,
      });
    }

    const dl = mgas.transport_records?.driving_license;
    if (journeyId === 'driving_license' && dl && dl.valid_until < today) {
      alerts.push({
        department: 'rto',
        reason: 'EXPIRED',
        missing_record_type: 'Valid Driving Licence',
        severity: 'WARNING',
        citizen_guidance_en: `Your licence expired on ${dl.valid_until}. If renewal is sought more than one year after expiry, a fresh test of competence may be required (Motor Vehicles Act 1988, s.15).`,
        citizen_guidance_mr: `आपला परवाना ${dl.valid_until} रोजी कालबाह्य झाला. कालबाह्यतेनंतर एक वर्षाहून अधिक काळाने नूतनीकरणासाठी पुन्हा क्षमता चाचणी आवश्यक असू शकते (मोटार वाहन कायदा १९८८, कलम १५).`,
        portal_url: 'https://sarathi.parivahan.gov.in',
      });
    }

    return alerts;
  }
}
