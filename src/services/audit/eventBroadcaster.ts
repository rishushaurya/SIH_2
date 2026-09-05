import { Response } from 'express';

export interface InspectionEvent {
  type: 'EVENT_AUTH' | 'EVENT_CONSENT_MINT' | 'EVENT_CONSENT_REVOKE' | 'EVENT_QUERY_DISPATCH' | 'EVENT_IDENTITY_MATCH' | 'EVENT_NORMALIZER' | 'EVENT_AUDIT_MINED';
  timestamp: string;
  data: Record<string, any>;
}

export class EventBroadcaster {
  private static clients: Response[] = [];

  public static addClient(res: Response): void {
    this.clients.push(res);
  }

  public static removeClient(res: Response): void {
    this.clients = this.clients.filter((client) => client !== res);
  }

  public static broadcast(event: InspectionEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.write(payload);
      } catch (err) {
        // Drop disconnected client
        this.removeClient(client);
      }
    });
  }

  public static emit(type: InspectionEvent['type'], data: Record<string, any>): void {
    const event: InspectionEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    this.broadcast(event);
  }
}
