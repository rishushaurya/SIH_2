import { Db, MongoClient } from 'mongodb';
import mysql from 'mysql2/promise';
import { Client } from 'pg';
import { env, mysqlConfig, pgConfig } from '../config/env';
import { CERTIFICATES, REVENUE_LAND_RECORDS, RTO_DRIVING_LICENSES, RTO_VEHICLES } from './fixtures';

// The seeder (and the live-ingest demo) act as each department's DBA, using *_ADMIN_* credentials when set.
// Adapters then connect with the SELECT-only accounts created here: the middleware cannot write department data.
const pgAdmin = env.PG_ADMIN_USER ? { ...pgConfig, user: env.PG_ADMIN_USER, password: env.PG_ADMIN_PASSWORD } : pgConfig;
const mysqlAdmin = env.MYSQL_ADMIN_USER ? { ...mysqlConfig, user: env.MYSQL_ADMIN_USER, password: env.MYSQL_ADMIN_PASSWORD } : mysqlConfig;
const mongoDbName = new URL(env.MONGO_URI).pathname.slice(1) || 'maha_certificates';

export async function withPg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client(pgAdmin);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function withMysql<T>(fn: (c: mysql.Connection) => Promise<T>): Promise<T> {
  const conn = await mysql.createConnection(mysqlAdmin);
  try {
    return await fn(conn);
  } finally {
    await conn.end();
  }
}

export async function withMongo<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(env.MONGO_ADMIN_URI || env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  try {
    return await fn(client.db(mongoDbName));
  } finally {
    await client.close();
  }
}

type LandRecord = (typeof REVENUE_LAND_RECORDS)[number];
const LAND_COLUMNS = Object.keys(REVENUE_LAND_RECORDS[0]) as Array<keyof LandRecord>;

export const insertLandRecord = (c: Client, row: LandRecord) =>
  c.query(
    `INSERT INTO revenue_land_records_712 (${LAND_COLUMNS.join(', ')})
     VALUES (${LAND_COLUMNS.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (survey_number, district, taluka, village) DO NOTHING`,
    LAND_COLUMNS.map((k) => row[k])
  );
export const insertDrivingLicense = (c: mysql.Connection, row: Record<string, unknown>) =>
  c.query('INSERT IGNORE INTO rto_driving_licenses SET ?', [row]);
export const insertVehicle = (c: mysql.Connection, row: Record<string, unknown>) =>
  c.query('INSERT IGNORE INTO rto_vehicle_registrations SET ?', [row]);
export const insertCertificate = (db: Db, doc: Record<string, unknown>) =>
  db.collection('citizen_certificates').updateOne({ certificate_id: doc.certificate_id }, { $set: doc }, { upsert: true });

async function seedRevenue(reset: boolean): Promise<string> {
  return withPg(async (c) => {
    // Marathi (Devanagari) owner names need UTF-8; Windows installers often default to WIN1252.
    const encoding = (await c.query('SHOW server_encoding')).rows[0].server_encoding;
    if (encoding !== 'UTF8') {
      throw new Error(`${env.PG_DATABASE} uses ${encoding}; recreate it with ENCODING 'UTF8' TEMPLATE template0 to store Marathi names.`);
    }
    if (reset) await c.query('DROP TABLE IF EXISTS revenue_land_records_712');
    await c.query(`
      CREATE TABLE IF NOT EXISTS revenue_land_records_712 (
        id SERIAL PRIMARY KEY,
        survey_number VARCHAR(64) NOT NULL,
        sub_division VARCHAR(32) NOT NULL,
        district VARCHAR(64) NOT NULL,
        taluka VARCHAR(64) NOT NULL,
        village VARCHAR(64) NOT NULL,
        owner_name_marathi VARCHAR(255) NOT NULL,
        owner_name_english VARCHAR(255) NOT NULL,
        aadhaar_hash CHAR(64) NOT NULL CHECK (aadhaar_hash ~ '^[a-f0-9]{64}$'),
        land_area_hectares NUMERIC(10, 4) NOT NULL,
        assessment_tax_inr NUMERIC(10, 2) NOT NULL,
        unirrigated_area_hectares NUMERIC(10, 4) DEFAULT 0,
        irrigated_area_hectares NUMERIC(10, 4) DEFAULT 0,
        encumbrances TEXT DEFAULT 'NIL',
        last_mutation_no VARCHAR(32) NOT NULL,
        last_mutation_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    await c.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_parcel ON revenue_land_records_712(survey_number, district, taluka, village)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_revenue_aadhaar ON revenue_land_records_712(aadhaar_hash)');
    await c.query('CREATE INDEX IF NOT EXISTS idx_revenue_location ON revenue_land_records_712(district, taluka, village)');

    // Change-data-capture trigger consumed by src/services/ingest/liveListener.ts
    await c.query(`
      CREATE OR REPLACE FUNCTION mahalink_notify_ingest() RETURNS trigger AS $$
      BEGIN
        PERFORM pg_notify('mahalink_ingest',
          json_build_object('table', TG_TABLE_NAME, 'record_id', NEW.id, 'aadhaar_hash', NEW.aadhaar_hash)::text);
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`);
    await c.query('DROP TRIGGER IF EXISTS trg_revenue_ingest ON revenue_land_records_712');
    await c.query('CREATE TRIGGER trg_revenue_ingest AFTER INSERT ON revenue_land_records_712 FOR EACH ROW EXECUTE FUNCTION mahalink_notify_ingest()');

    for (const row of REVENUE_LAND_RECORDS) await insertLandRecord(c, row);

    if (!env.PG_ADMIN_USER || env.PG_USER === env.PG_ADMIN_USER) return `${REVENUE_LAND_RECORDS.length} land records`;
    const exists = (await c.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [env.PG_USER])).rowCount;
    const ddl = await c.query(`SELECT format('${exists ? 'ALTER' : 'CREATE'} ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS sql`, [
      env.PG_USER,
      env.PG_PASSWORD,
    ]);
    await c.query(ddl.rows[0].sql);
    const grants = await c.query(
      `SELECT format('GRANT CONNECT ON DATABASE %I TO %I; GRANT USAGE ON SCHEMA public TO %I; GRANT SELECT ON revenue_land_records_712 TO %I', $1::text, $2::text, $2::text, $2::text) AS sql`,
      [env.PG_DATABASE, env.PG_USER]
    );
    await c.query(grants.rows[0].sql);
    return `${REVENUE_LAND_RECORDS.length} land records; SELECT-only role "${env.PG_USER}"`;
  });
}

async function seedRto(reset: boolean): Promise<string> {
  return withMysql(async (c) => {
    if (reset) await c.query('DROP TABLE IF EXISTS rto_driving_licenses, rto_vehicle_registrations');
    await c.query(`
      CREATE TABLE IF NOT EXISTS rto_driving_licenses (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await c.query(`
      CREATE TABLE IF NOT EXISTS rto_vehicle_registrations (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    for (const row of RTO_DRIVING_LICENSES) await insertDrivingLicense(c, row);
    for (const row of RTO_VEHICLES) await insertVehicle(c, row);

    if (!env.MYSQL_ADMIN_USER || env.MYSQL_USER === env.MYSQL_ADMIN_USER) {
      return `${RTO_DRIVING_LICENSES.length} licences, ${RTO_VEHICLES.length} vehicles`;
    }
    await c.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?", [env.MYSQL_USER, env.MYSQL_PASSWORD]);
    await c.query("ALTER USER ?@'%' IDENTIFIED BY ?", [env.MYSQL_USER, env.MYSQL_PASSWORD]);
    await c.query(`GRANT SELECT ON ${c.escapeId(env.MYSQL_DATABASE)}.* TO ?@'%'`, [env.MYSQL_USER]);
    return `${RTO_DRIVING_LICENSES.length} licences, ${RTO_VEHICLES.length} vehicles; SELECT-only user "${env.MYSQL_USER}"`;
  });
}

async function seedCertificates(reset: boolean): Promise<string> {
  return withMongo(async (db) => {
    if (reset) await db.collection('citizen_certificates').drop().catch(() => undefined);
    if (!(await db.listCollections({ name: 'citizen_certificates' }).hasNext())) {
      await db.createCollection('citizen_certificates', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['certificate_id', 'aadhaar_hash', 'certificate_type', 'applicant_details', 'status'],
            properties: {
              certificate_id: { bsonType: 'string' },
              aadhaar_hash: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
              certificate_type: { enum: ['INCOME_CERTIFICATE', 'CASTE_CERTIFICATE', 'DOMICILE_CERTIFICATE'] },
              applicant_details: { bsonType: 'object', required: ['full_name_english', 'district', 'pincode'] },
              status: { enum: ['APPROVED', 'PENDING', 'REJECTED'] },
            },
          },
        },
      });
    }
    const collection = db.collection('citizen_certificates');
    await collection.createIndex({ aadhaar_hash: 1 });
    await collection.createIndex({ certificate_id: 1 }, { unique: true });
    for (const doc of CERTIFICATES) await insertCertificate(db, doc);

    const reader = new URL(env.MONGO_URI);
    if (!env.MONGO_ADMIN_URI || !reader.username) return `${CERTIFICATES.length} certificates`;
    const user = decodeURIComponent(reader.username);
    const pwd = decodeURIComponent(reader.password);
    const roles = [{ role: 'read', db: mongoDbName }];
    try {
      await db.command({ createUser: user, pwd, roles });
    } catch (err: any) {
      if (err.code !== 51003) throw err; // already exists
      await db.command({ updateUser: user, pwd, roles });
    }
    return `${CERTIFICATES.length} certificates; read-only user "${user}"`;
  });
}

export async function runDatabaseSeed(reset = false): Promise<boolean> {
  console.log('Seeding department databases' + (reset ? ' (reset)' : '') + '...\n');
  const steps: Array<[string, () => Promise<string>]> = [
    ['PostgreSQL (Revenue)', () => seedRevenue(reset)],
    ['MySQL (RTO)', () => seedRto(reset)],
    ['MongoDB (Certificates)', () => seedCertificates(reset)],
  ];
  let ok = true;
  for (const [name, step] of steps) {
    try {
      console.log(`[PASS] ${name}: ${await step()}`);
    } catch (err: any) {
      ok = false;
      console.log(`[FAIL] ${name}: ${err.message}`);
    }
  }
  console.log('\nEducation (legacy CSV) needs no seeding: files are read from CSV_DATA_DIR.');
  return ok;
}

if (require.main === module) {
  runDatabaseSeed(process.argv.includes('--reset')).then((ok) => process.exit(ok ? 0 : 1));
}
