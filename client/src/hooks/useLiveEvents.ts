import { useEffect, useRef, useState } from 'react';

export interface LiveEvent {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

export function useLiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/v1/events/stream');
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event && event.type) {
          setEvents((prev) => [event, ...prev].slice(0, 100));
        }
      } catch {
        // ignore parse error on keepalive comments
      }
    };
    es.onerror = () => setIsConnected(false);

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, []);

  const clearEvents = () => setEvents([]);
  return { events, isConnected, clearEvents };
}
