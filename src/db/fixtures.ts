// Seed data for the four department systems (DATABASE_SPEC.md §3), with deliberate real-world discrepancies.
// Used by `npm run db:seed` and, only when DEMO_MODE=true and a database is unreachable, by the adapters.

const PRIYA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const RAJESH = '9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619';
const ANANYA = 'a81b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b';
const SUNIL = 'b72c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';

// PostgreSQL: revenue_land_records_712
export const REVENUE_LAND_RECORDS = [
  {
    survey_number: '45/1A', sub_division: '1A', district: 'Pune', taluka: 'Haveli', village: 'Wagholi',
    owner_name_marathi: 'शर्मा प्रिया रमेश', owner_name_english: 'Priya Ramesh Sharma', aadhaar_hash: PRIYA,
    land_area_hectares: 1.45, assessment_tax_inr: 1850, unirrigated_area_hectares: 0.45, irrigated_area_hectares: 1.0,
    encumbrances: 'NIL', last_mutation_no: 'MUT-2024-8891', last_mutation_date: '2024-03-15',
  },
  {
    survey_number: '88/2', sub_division: '2', district: 'Pune', taluka: 'Baramati', village: 'Malegaon',
    owner_name_marathi: 'पवार राजेश गणपत', owner_name_english: 'Rajesh Ganpat Pawar', aadhaar_hash: RAJESH,
    land_area_hectares: 3.2, assessment_tax_inr: 3400, unirrigated_area_hectares: 1.2, irrigated_area_hectares: 2.0,
    encumbrances: 'Crop Loan: Bank of Maharashtra (INR 1,50,000)', last_mutation_no: 'MUT-2023-4112', last_mutation_date: '2023-11-20',
  },
  {
    survey_number: '12/4', sub_division: '4', district: 'Nashik', taluka: 'Niphad', village: 'Pimpalgaon',
    owner_name_marathi: 'देशमुख अनन्या विजय', owner_name_english: 'Ananya Vijay Deshmukh', aadhaar_hash: ANANYA,
    land_area_hectares: 0.85, assessment_tax_inr: 920, unirrigated_area_hectares: 0, irrigated_area_hectares: 0.85,
    encumbrances: 'NIL', last_mutation_no: 'MUT-2025-1002', last_mutation_date: '2025-01-10',
  },
  {
    survey_number: '101', sub_division: '1', district: 'Satara', taluka: 'Karad', village: 'Malkapur',
    owner_name_marathi: 'जाधव सुनील बबन', owner_name_english: 'Sunil Baban Jadhav', aadhaar_hash: SUNIL,
    land_area_hectares: 2.1, assessment_tax_inr: 2240, unirrigated_area_hectares: 1.1, irrigated_area_hectares: 1.0,
    encumbrances: 'NIL', last_mutation_no: 'MUT-2022-3307', last_mutation_date: '2022-06-02',
  },
];

// MySQL: rto_driving_licenses (Sarathi)
export const RTO_DRIVING_LICENSES = [
  {
    dl_number: 'MH12-20190012891', aadhaar_hash: PRIYA, holder_name: 'Priya R. Sharma', date_of_birth: '1998-07-24',
    issue_date: '2019-08-12', expiry_date: '2039-08-11', vehicle_classes: 'MCWG, LMV', rto_code: 'MH-12', blood_group: 'B+', status: 'ACTIVE',
  },
  {
    dl_number: 'MH42-20189911200', aadhaar_hash: RAJESH, holder_name: 'Rajesh G. Pawar', date_of_birth: '1985-04-14',
    issue_date: '2018-05-19', expiry_date: '2038-05-18', vehicle_classes: 'LMV, TRANS', rto_code: 'MH-42', blood_group: 'O+', status: 'ACTIVE',
  },
  {
    dl_number: 'MH11-20040045521', aadhaar_hash: SUNIL, holder_name: 'Sunil B. Jadhav', date_of_birth: '1979-01-30',
    issue_date: '2004-02-10', expiry_date: '2024-02-09', vehicle_classes: 'MCWG, LMV', rto_code: 'MH-11', blood_group: 'A+', status: 'EXPIRED',
  },
];

// MySQL: rto_vehicle_registrations (Vahan)
export const RTO_VEHICLES = [
  {
    registration_number: 'MH-12-AB-1234', aadhaar_hash: PRIYA, owner_name: 'Priya Ramesh Sharma',
    vehicle_make_model: 'Tata Nexon EV', chassis_number: 'MAT612093M8912801', fuel_type: 'ELECTRIC', commercial_flag: false,
    fitness_validity: '2034-08-10', insurance_validity: '2027-08-09', pucc_validity: '2026-12-31',
  },
  {
    registration_number: 'MH-15-XY-9900', aadhaar_hash: ANANYA, owner_name: 'Ananya V. Deshmukh',
    vehicle_make_model: 'Honda Activa 6G', chassis_number: 'ME4JF91BKP7123456', fuel_type: 'PETROL', commercial_flag: false,
    fitness_validity: '2037-03-01', insurance_validity: '2027-03-01', pucc_validity: '2026-09-30',
  },
];

// MongoDB: citizen_certificates (MahaOnline e-District). One document per issued certificate.
export const CERTIFICATES = [
  {
    certificate_id: 'MH-INC-2025-009182', aadhaar_hash: PRIYA, certificate_type: 'INCOME_CERTIFICATE',
    applicant_details: { full_name_english: 'Priya Ramesh Sharma', full_name_marathi: 'प्रिया रमेश शर्मा', district: 'Pune', taluka: 'Haveli', pincode: '411030' },
    financial_assessment: { annual_income_inr: 340000, assessment_year: '2025-2026', issuing_authority: 'Tahsildar Haveli, Pune', valid_until: '2028-03-31' },
    status: 'APPROVED',
  },
  {
    certificate_id: 'MH-CST-2024-001289', aadhaar_hash: RAJESH, certificate_type: 'CASTE_CERTIFICATE',
    applicant_details: { full_name_english: 'Rajesh Ganpat Pawar', full_name_marathi: 'पवार राजेश गणपत', district: 'Pune', taluka: 'Baramati', pincode: '413102' },
    caste_details: { caste_category: 'OBC', sub_caste: 'Kunbi', issuing_authority: 'Sub-Divisional Officer, Baramati' },
    status: 'APPROVED',
  },
  {
    certificate_id: 'MH-INC-2025-004410', aadhaar_hash: ANANYA, certificate_type: 'INCOME_CERTIFICATE',
    applicant_details: { full_name_english: 'Ananya Vijay Deshmukh', full_name_marathi: 'देशमुख अनन्या विजय', district: 'Nashik', taluka: 'Niphad', pincode: '422209' },
    financial_assessment: { annual_income_inr: 210000, assessment_year: '2025-2026', issuing_authority: 'Tahsildar Niphad, Nashik', valid_until: '2028-03-31' },
    status: 'APPROVED',
  },
  {
    certificate_id: 'MH-CST-2025-004412', aadhaar_hash: ANANYA, certificate_type: 'CASTE_CERTIFICATE',
    applicant_details: { full_name_english: 'Ananya Vijay Deshmukh', full_name_marathi: 'देशमुख अनन्या विजय', district: 'Nashik', taluka: 'Niphad', pincode: '422209' },
    caste_details: { caste_category: 'SEBC', sub_caste: 'Maratha', issuing_authority: 'Sub-Divisional Officer, Niphad' },
    status: 'APPROVED',
  },
  {
    certificate_id: 'MH-INC-2025-007731', aadhaar_hash: SUNIL, certificate_type: 'INCOME_CERTIFICATE',
    applicant_details: { full_name_english: 'Sunil Baban Jadhav', full_name_marathi: 'जाधव सुनील बबन', district: 'Satara', taluka: 'Karad', pincode: '415110' },
    financial_assessment: { annual_income_inr: 180000, assessment_year: '2025-2026', issuing_authority: 'Tahsildar Karad, Satara', valid_until: '2028-03-31' },
    status: 'APPROVED',
  },
];
