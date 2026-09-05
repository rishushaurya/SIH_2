import { EventBroadcaster } from '../audit/eventBroadcaster';

export interface IngestionEvent {
  department: string;
  source_table: string;
  aadhaar_hash: string;
  record_id: string;
  payload: Record<string, any>;
  timestamp: string;
}

export class LiveDataIngestionListener {
  private static isListening: boolean = false;

  public static startListening(): void {
    if (this.isListening) return;
    this.isListening = true;

    console.log('[LIVE_INGEST] Live Database Change-Data-Capture (CDC) Listener initialized.');
  }

  public static handleLiveRecordInserted(event: IngestionEvent): void {
    console.log(`[LIVE_INGEST] New record detected in Department '${event.department}' (Table: ${event.source_table}) for citizen hash: ${event.aadhaar_hash.slice(0, 10)}...`);

    // Broadcast event to Live Inspection Console
    EventBroadcaster.emit('EVENT_QUERY_DISPATCH', {
      type: 'LIVE_RECORD_INGESTED',
      department: event.department,
      table: event.source_table,
      record_id: event.record_id,
      timestamp: event.timestamp,
    });
  }
}
