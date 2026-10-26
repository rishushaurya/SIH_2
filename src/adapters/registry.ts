import { env } from '../config/env';
import { certificateAdapter } from './certificateAdapter';
import { educationAdapter } from './educationAdapter';
import { readMtls, RemoteAdapter } from './remoteAdapter';
import { revenueAdapter } from './revenueAdapter';
import { rtoAdapter } from './rtoAdapter';
import { DepartmentAdapter } from './types';

export const localAdapters: Record<string, DepartmentAdapter> = {
  revenue: revenueAdapter,
  rto: rtoAdapter,
  certificates: certificateAdapter,
  education: educationAdapter,
};

// Departments listed in REMOTE_ADAPTERS are reached through their Security Server over mTLS;
// the rest run in-process (adapter co-located with the gateway).
const remoteUrls = Object.fromEntries(env.REMOTE_ADAPTERS.map((entry) => entry.split('=') as [string, string]));
const tls = Object.keys(remoteUrls).length
  ? readMtls({ key: env.MTLS_KEY_FILE, cert: env.MTLS_CERT_FILE, ca: env.MTLS_CA_FILE })
  : undefined;

export const departmentAdapters: Record<string, DepartmentAdapter> = Object.fromEntries(
  Object.entries(localAdapters).map(([dept, local]) => [
    dept,
    remoteUrls[dept] ? new RemoteAdapter(dept, local.departmentName, remoteUrls[dept], tls!) : local,
  ])
);
