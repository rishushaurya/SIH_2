import type { Journey } from '../workflow/journeys';
import type { NormalizedMGASPayload } from './mgasNormalizer';

type Mapper = (m: NormalizedMGASPayload, rules: Record<string, number>) => string | undefined;

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const displayName = (m: NormalizedMGASPayload) => {
  const { full_name_english: en, full_name_marathi: mr } = m.citizen_profile;
  return mr && mr !== en ? `${en} (${mr})` : en;
};
const income = (m: NormalizedMGASPayload) => m.certificate_records?.income_certificate?.annual_income_inr;

// Form keys used by journey configs -> value derived from the MGAS payload, so any integrating portal
// receives form-ready values. Computed fields use thresholds from the journey's `rules` block.
const FIELD_MAPPERS: Record<string, Mapper> = {
  applicant_name: displayName,
  student_name: displayName,
  land_survey_number: (m) => m.revenue_land_records?.survey_number,
  land_area_hectares: (m) => m.revenue_land_records && `${m.revenue_land_records.land_area_hectares} ha`,
  property_tax_annual: (m) => m.revenue_land_records && inr(m.revenue_land_records.annual_assessment_tax_inr),
  vehicle_count: (m) => m.transport_records?.registered_vehicles && `${m.transport_records.registered_vehicles.length} vehicle(s)`,
  primary_vehicle_reg: (m) => {
    const v = m.transport_records?.registered_vehicles?.[0];
    return v && `${v.registration_number} (${v.make_model})`;
  },
  previous_assessed_income: (m) => (income(m) === undefined ? undefined : inr(income(m)!)),
  family_annual_income: (m) => (income(m) === undefined ? undefined : inr(income(m)!)),
  calculated_income_bracket: (m, r) => {
    const value = income(m);
    if (value === undefined || r.ews_income_limit_inr === undefined) return undefined;
    return value <= r.ews_income_limit_inr
      ? `Up to ${inr(r.ews_income_limit_inr)} (within EWS income limit)`
      : `Above ${inr(r.ews_income_limit_inr)}`;
  },
  dl_number: (m) => m.transport_records?.driving_license?.dl_number,
  vehicle_classes: (m) => m.transport_records?.driving_license?.authorized_classes,
  dl_expiry_date: (m) => m.transport_records?.driving_license?.valid_until,
  residential_district: (m) => m.verified_address?.district,
  residential_village: (m) => m.verified_address && `${m.verified_address.taluka} / ${m.verified_address.village}`,
  student_roll_no: (m) => m.education_records?.student_roll_no,
  marks_percentage: (m) => m.education_records && `${m.education_records.percentage}% (${m.education_records.grade})`,
  caste_certificate_id: (m) => m.certificate_records?.caste_certificate?.certificate_id,
  caste_category: (m) => {
    const c = m.certificate_records?.caste_certificate;
    return c && (c.sub_caste ? `${c.caste_category} (${c.sub_caste})` : c.caste_category);
  },
  eligibility_status: (m, r) => {
    const pct = m.education_records?.percentage;
    const value = income(m);
    if (pct === undefined || value === undefined) return undefined;
    const eligible = pct >= r.min_marks_percentage && value <= r.max_family_income_inr;
    return eligible
      ? `Indicatively eligible (marks ≥ ${r.min_marks_percentage}%, income ≤ ${inr(r.max_family_income_inr)})`
      : `Not eligible under configured criteria (marks ≥ ${r.min_marks_percentage}%, income ≤ ${inr(r.max_family_income_inr)})`;
  },
};

export function mapFormValues(journey: Journey, mgas: NormalizedMGASPayload): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of journey.form_fields) {
    const value = FIELD_MAPPERS[field.key]?.(mgas, journey.rules ?? {});
    if (value !== undefined) values[field.key] = value;
  }
  return values;
}
