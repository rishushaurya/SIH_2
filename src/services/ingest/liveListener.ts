import { Client } from 'pg';
import { pgConfig } from '../../config/env';
import { log } from '../../gateway/logger';
import { EventBroadcaster } from '../audit/eventBroadcaster';

const CHANNEL = 'mahalink_ingest';
const RETRY_MS = 15_000;

// Change-data-capture for the Revenue database: the seeder installs an AFTER INSERT trigger that calls
// pg_notify('mahalink_ingest', ...). New 7/12 rows appear on the Live Inspection Console immediately.
// MySQL and MongoDB records need no listener: adapters read just-in-time, so new rows are picked up on the next query.
export async function startLiveListener(): Promise<void> {
  const client = new Client(pgConfig);
  const retry = () => {
    client.removeAllListeners();
    client.end().catch(() => undefined);
    setTimeout(() => void startLiveListener(), RETRY_MS).unref();
  };

  try {
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
  } catch {
    log('INFO', 'live ingest listener waiting for PostgreSQL', { retry_in_ms: RETRY_MS });
    return retry();
  }

  log('INFO', 'live ingest listener active', { channel: CHANNEL });
  client.on('notification', (msg) => {
    try {
      const change = JSON.parse(msg.payload || '{}');
      EventBroadcaster.emit(
        'EVENT_LIVE_INGEST',
        { department: 'revenue', table: change.table, record_id: change.record_id },
        { subject: change.aadhaar_hash }
      );
    } catch {
      // ignore malformed payloads
    }
  });
  client.on('error', retry);
}
