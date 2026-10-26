import mysql, { RowDataPacket } from 'mysql2/promise';
import { mysqlConfig } from '../config/env';
import { RTO_DRIVING_LICENSES, RTO_VEHICLES } from '../db/fixtures';
import { AdapterHealth, assertCitizenHash, DepartmentAdapter, liveOrFixture, probe, RawDepartmentRecord, toRecord } from './types';

const DL_QUERY = `SELECT dl_number, holder_name, expiry_date, vehicle_classes, rto_code, status
                  FROM rto_driving_licenses WHERE aadhaar_hash = ? ORDER BY expiry_date DESC LIMIT 1`;
const VEHICLE_QUERY = `SELECT registration_number, owner_name, vehicle_make_model, fuel_type, fitness_validity
                       FROM rto_vehicle_registrations WHERE aadhaar_hash = ?`;

const transportRecord = (dl: any, vehicles: any[]) => (dl || vehicles.length ? { driving_license: dl ?? null, vehicles } : null);

export class RTOAdapter implements DepartmentAdapter {
  public departmentId = 'rto';
  public departmentName = 'Transport Department (Sarathi DL & Vahan RC)';
  private pool = mysql.createPool({ ...mysqlConfig, connectionLimit: 10 });

  public ping(): Promise<AdapterHealth> {
    return probe(() => this.pool.query('SELECT 1'));
  }

  public async queryCitizenRecord(aadhaarHash: string): Promise<RawDepartmentRecord | null> {
    assertCitizenHash(aadhaarHash);
    const result = await liveOrFixture(
      async () => {
        const [dl] = await this.pool.query<RowDataPacket[]>({ sql: DL_QUERY, timeout: 2000 }, [aadhaarHash]);
        const [vehicles] = await this.pool.query<RowDataPacket[]>({ sql: VEHICLE_QUERY, timeout: 2000 }, [aadhaarHash]);
        return transportRecord(dl[0], vehicles);
      },
      () =>
        transportRecord(
          RTO_DRIVING_LICENSES.find((r) => r.aadhaar_hash === aadhaarHash),
          RTO_VEHICLES.filter((r) => r.aadhaar_hash === aadhaarHash)
        )
    );
    return toRecord(this.departmentId, aadhaarHash, 'Sarathi & Vahan MySQL', result);
  }
}

export const rtoAdapter = new RTOAdapter();
