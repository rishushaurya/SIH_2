export interface MissingDocumentAlert {
  department: string;
  missing_record_type: string;
  severity: 'WARNING' | 'CRITICAL';
  citizen_guidance_en: string;
  citizen_guidance_mr: string;
  portal_url: string;
}

export class MissingDocDetector {
  public static evaluate(
    journeyId: string,
    rawDepartmentData: Record<string, any>
  ): MissingDocumentAlert[] {
    const alerts: MissingDocumentAlert[] = [];

    if (journeyId === 'income_certificate') {
      if (!rawDepartmentData.revenue?.data) {
        alerts.push({
          department: 'revenue',
          missing_record_type: '7/12 Land Record Extract',
          severity: 'WARNING',
          citizen_guidance_en:
            'No land record found under your Aadhaar. If you do not own land, please provide an employer salary slip or municipal tax receipt.',
          citizen_guidance_mr:
            'आपल्या आधार क्रमांकावर ७/१२ नोंद आढळली नाही. जमीन नसल्यास कृपया पगार पावती किंवा नगरपरिषद कर पावती जोडावी.',
          portal_url: 'https://mahabhumi.gov.in',
        });
      }
    }

    if (journeyId === 'scholarship_application') {
      if (!rawDepartmentData.certificates?.data) {
        alerts.push({
          department: 'certificates',
          missing_record_type: 'Caste / Income Certificate',
          severity: 'CRITICAL',
          citizen_guidance_en:
            'Caste or Income Certificate not found in e-District registry. Please apply on Aaple Sarkar prior to scholarship submission.',
          citizen_guidance_mr:
            'ई-डिस्ट्रिक्ट नोंदणीत जात किंवा उत्पन्न प्रमाणपत्र आढळले नाही. कृपया शिष्यवृत्ती अर्जापूर्वी आपले सरकारवर अर्ज करावा.',
          portal_url: 'https://aaplesarkar.mahaonline.gov.in',
        });
      }
    }

    return alerts;
  }
}
