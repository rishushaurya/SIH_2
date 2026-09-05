# Database & Adapter Specification: MahaLink

> Document Version: 1.0.0  
> Date: September 2026  
> System: MahaLink — Federated Interoperability & Consent Middleware  

---

## 1. Multi-Database Topology Overview

MahaLink integrates 4 distinct, heterogeneous database technologies to mirror real-world state governance:
1. **Revenue Department:** PostgreSQL 16 (Relational Land Records & 7/12 Extracts).
2. **RTO Transport Department:** MySQL 8.0 (Vehicle Registrations & Driving Licenses).
3. **Certificate Services:** MongoDB 7.0 (NoSQL Income, Caste & Domicile records).
4. **Education Department:** Legacy Tabular CSV Files (Board Marksheets & Student Rolls).

---

## 2. Complete Database Schemas & Data Dictionaries

### 2.1 Revenue Department (PostgreSQL 16)
```sql
-- Database: maha_revenue
DROP TABLE IF EXISTS revenue_land_records_712;
CREATE TABLE revenue_land_records_712 (
    id SERIAL PRIMARY KEY,
    survey_number VARCHAR(64) NOT NULL,
    sub_division VARCHAR(32) NOT NULL,
    district VARCHAR(64) NOT NULL,
    taluka VARCHAR(64) NOT NULL,
    village VARCHAR(64) NOT NULL,
    owner_name_marathi VARCHAR(255) NOT NULL,
    owner_name_english VARCHAR(255) NOT NULL,
    aadhaar_hash CHAR(64) NOT NULL,
    land_area_hectares NUMERIC(10, 4) NOT NULL,
    assessment_tax_inr NUMERIC(10, 2) NOT NULL,
    unirrigated_area_hectares NUMERIC(10, 4) DEFAULT 0.0000,
    irrigated_area_hectares NUMERIC(10, 4) DEFAULT 0.0000,
    encumbrances TEXT DEFAULT 'NIL',
    last_mutation_no VARCHAR(32) NOT NULL,
    last_mutation_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revenue_aadhaar ON revenue_land_records_712(aadhaar_hash);
CREATE INDEX idx_revenue_location ON revenue_land_records_712(district, taluka, village);
```

### 2.2 RTO Transport Department (MySQL 8.0)
```sql
-- Database: maha_rto
DROP TABLE IF EXISTS rto_driving_licenses;
CREATE TABLE rto_driving_licenses (
    dl_number VARCHAR(32) PRIMARY KEY,
    aadhaar_hash CHAR(64) NOT NULL,
    holder_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    vehicle_classes VARCHAR(64) NOT NULL,
    rto_code VARCHAR(16) NOT NULL,
    blood_group VARCHAR(8),
    status ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED') DEFAULT 'ACTIVE',
    INDEX idx_rto_dl_aadhaar (aadhaar_hash)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS rto_vehicle_registrations;
CREATE TABLE rto_vehicle_registrations (
    registration_number VARCHAR(32) PRIMARY KEY,
    aadhaar_hash CHAR(64) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    vehicle_make_model VARCHAR(128) NOT NULL,
    chassis_number VARCHAR(64) UNIQUE NOT NULL,
    fuel_type VARCHAR(32) NOT NULL,
    commercial_flag BOOLEAN DEFAULT FALSE,
    fitness_validity DATE NOT NULL,
    insurance_validity DATE NOT NULL,
    pucc_validity DATE NOT NULL,
    INDEX idx_rto_veh_aadhaar (aadhaar_hash)
) ENGINE=InnoDB;
```

### 2.3 Certificate Services (MongoDB 7.0 JSON Schemas)
```javascript
// Database: maha_certificates, Collection: citizen_certificates
db.createCollection("citizen_certificates", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["certificate_id", "aadhaar_hash", "certificate_type", "applicant_details", "status"],
      properties: {
        certificate_id: { bsonType: "string" },
        aadhaar_hash: { bsonType: "string", pattern: "^[a-f0-9]{64}$" },
        certificate_type: { enum: ["INCOME_CERTIFICATE", "CASTE_CERTIFICATE", "DOMICILE_CERTIFICATE"] },
        applicant_details: {
          bsonType: "object",
          required: ["full_name_english", "district", "pincode"],
          properties: {
            full_name_english: { bsonType: "string" },
            full_name_marathi: { bsonType: "string" },
            father_or_husband_name: { bsonType: "string" },
            address_line: { bsonType: "string" },
            district: { bsonType: "string" },
            taluka: { bsonType: "string" },
            pincode: { bsonType: "string" }
          }
        },
        financial_assessment: {
          bsonType: "object",
          properties: {
            annual_income_inr: { bsonType: "number" },
            assessment_year: { bsonType: "string" },
            issuing_authority: { bsonType: "string" }
          }
        },
        status: { enum: ["APPROVED", "PENDING", "REJECTED"] }
      }
    }
  }
});
db.citizen_certificates.createIndex({ "aadhaar_hash": 1 });
```

### 2.4 Education Department (Legacy CSV Format)
- **File:** `db/files/education_marksheets.csv`
- **Columns:** `student_roll_no`, `aadhaar_hash`, `candidate_name_en`, `board_name`, `passing_year`, `marks_obtained`, `total_marks`, `percentage`, `grade`, `institution_code`

---

## 3. Deterministic Seed Data Personas (With Intentional Discrepancies)

| Persona ID | Aadhaar Hash Anchor | Revenue Record (PG) | RTO Record (MySQL) | Certificate Record (Mongo) | Education Record (CSV) | Real-World Conflict Handled |
|:---|:---|:---|:---|:---|:---|:---|
| **P-01 (Priya Sharma)** | `e3b0c44298...` | "शर्मा प्रिया रमेश" / "Priya Ramesh Sharma" (Survey #45/1A, Haveli) | "Priya R. Sharma" (MH-12-DL-20190012, Car: MH-12-AB-1234) | "Priya Ramesh Sharma" (Income Cert: ₹3,40,000) | "Priya R Sharma" (Marks: 89.54%) | Script mismatch (Devanagari vs English) & middle name abbreviation resolved by Identity Resolver. |
| **P-02 (Rajesh Pawar)** | `9f83c120a1...` | "पवार राजेश गणपत" (Survey #88/2, Baramati) | "Rajesh G. Pawar" (MH-42-DL-20189911) | "Rajesh Ganpat Pawar" (Caste Cert: OBC) | "Rajesh Pawar" (Marks: 76.20%) | Address variation: Baramati Rural vs Pune Urban. |
| **P-03 (Ananya Deshmukh)**| `a81b2c3d4e...` | "देशमुख अनन्य विजय" (Survey #12/4, Nashik) | "Ananya V. Deshmukh" (Scooter: MH-15-XY-9900) | "Ananya Deshmukh" (Domicile Cert: Maharashtra) | "Ananya Vijay Deshmukh" (Marks: 94.10%) | Incomplete phone number in legacy education stream; filled from RTO profile. |
| **P-04 (Sunil Jadhav)** | `b72c3d4e5f...` | "जाधव सुनील बबन" (Survey #101, Satara) | "Sunil B. Jadhav" (Status: EXPIRED DL) | "Sunil Baban Jadhav" (Income: ₹1,80,000) | Missing Record (Did not attend MSBSHSE) | Missing record gracefully ignored; expired DL flagged in UI. |
