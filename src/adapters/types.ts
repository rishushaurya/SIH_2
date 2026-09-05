export interface DepartmentAdapter {
  departmentId: string;
  departmentName: string;
  ping(): Promise<{ status: 'UP' | 'DOWN'; latency_ms: number; error?: string }>;
  queryCitizenRecord(aadhaarHash: string, consentToken?: string): Promise<RawDepartmentRecord | null>;
}

export interface RawDepartmentRecord {
  department: string;
  query_timestamp: string;
  aadhaar_hash: string;
  data: Record<string, any>;
  verified_source: string;
}
