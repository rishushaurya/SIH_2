import { Response } from 'express';
import { SessionUser } from '../auth/jwt';

export type InspectionEventType =
  | 'EVENT_AUTH'
  | 'EVENT_CONSENT_MINT'
  | 'EVENT_CONSENT_REVOKE'
  | 'EVENT_QUERY_DISPATCH'
  | 'EVENT_IDENTITY_MATCH'
  | 'EVENT_NORMALIZER'
  | 'EVENT_AUDIT_MINED'
  | 'EVENT_LIVE_INGEST';

export interface InspectionEvent {
  type: InspectionEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

interface Client {
  res: Response;
  user: SessionUser;
}

// Server-Sent Events for the Live Inspection Console. An event reaches the citizen it concerns (`subject`)
// and administrators; `pii` fields (names) go only to that citizen.
export class EventBroadcaster {
  private static clients = new Set<Client>();

  // Keep idle connections open through proxies.
  private static heartbeat = setInterval(() => {
    for (const client of EventBroadcaster.clients) client.res.write(': keep-alive\n\n');
  }, 25_000).unref();

  public static addClient(res: Response, user: SessionUser): () => void {
    const client = { res, user };
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  public static emit(
    type: InspectionEventType,
    data: Record<string, unknown>,
    scope: { subject?: string; pii?: Record<string, unknown> } = {}
  ): void {
    const timestamp = new Date().toISOString();
    for (const client of this.clients) {
      const isOwner = Boolean(scope.subject) && client.user.citizen_hash === scope.subject;
      if (!isOwner && client.user.role === 'CITIZEN') continue;
      const event: InspectionEvent = { type, timestamp, data: isOwner ? { ...data, ...scope.pii } : data };
      try {
        client.res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
