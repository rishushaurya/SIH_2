import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { AdapterHealth, assertCitizenHash, DepartmentAdapter, RawDepartmentRecord, toRecord } from './types';

export const EDUCATION_CSV_HEADERS = [
  'student_roll_no', 'aadhaar_hash', 'candidate_name_en', 'board_name', 'passing_year',
  'marks_obtained', 'total_marks', 'percentage', 'grade', 'institution_code',
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Strip spreadsheet formula triggers (CSV / DDE injection) from text cells.
const clean = (value: string) => value.replace(/^[=+\-@\t\r]+/, '').trim();

// The board's legacy system is a directory of CSV dumps; every *.csv file in CSV_DATA_DIR is a live source.
export class EducationAdapter implements DepartmentAdapter {
  public departmentId = 'education';
  public departmentName = 'School & Higher Education Board (Legacy CSV Records)';
  private dir = path.resolve(env.CSV_DATA_DIR);

  private files(): string[] {
    return fs
      .readdirSync(this.dir)
      .filter((f) => f.endsWith('.csv'))
      .map((f) => path.join(this.dir, f));
  }

  public async ping(): Promise<AdapterHealth> {
    const start = Date.now();
    let found = false;
    try {
      found = this.files().length > 0;
    } catch {
      // directory missing
    }
    return { status: found ? 'UP' : 'DOWN', source: 'live', latency_ms: Date.now() - start };
  }

  public async queryCitizenRecord(aadhaarHash: string): Promise<RawDepartmentRecord | null> {
    assertCitizenHash(aadhaarHash);
    for (const file of this.files()) {
      const row = await this.scan(file, aadhaarHash);
      if (row) return toRecord(this.departmentId, aadhaarHash, `MSBSHSE legacy CSV ${path.basename(file)}`, { value: row, source: 'live' });
    }
    return null;
  }

  private async scan(file: string, aadhaarHash: string): Promise<Record<string, unknown> | null> {
    if ((await fs.promises.stat(file)).size > MAX_FILE_BYTES) {
      throw new Error(`${path.basename(file)} exceeds the 10 MB ingestion cap.`);
    }
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(file);
      stream
        .pipe(csv({ strict: true }))
        .on('headers', (headers: string[]) => {
          if (headers.join(',') !== EDUCATION_CSV_HEADERS.join(',')) {
            stream.destroy();
            reject(new Error(`Unexpected CSV header sequence in ${path.basename(file)}.`));
          }
        })
        .on('data', (row: Record<string, string>) => {
          if (row.aadhaar_hash !== aadhaarHash) return;
          stream.destroy();
          resolve({
            student_roll_no: clean(row.student_roll_no),
            candidate_name_en: clean(row.candidate_name_en),
            board_name: clean(row.board_name),
            passing_year: Number(row.passing_year),
            marks_obtained: Number(row.marks_obtained),
            total_marks: Number(row.total_marks),
            percentage: Number(row.percentage),
            grade: clean(row.grade),
            institution_code: clean(row.institution_code),
          });
        })
        .on('end', () => resolve(null))
        .on('error', reject);
      stream.on('error', reject);
    });
  }
}

export const educationAdapter = new EducationAdapter();
