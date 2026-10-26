import fs from 'fs';
import path from 'path';

export interface FormField {
  key: string;
  label_en: string;
  label_mr: string;
  source: string;
}

// Department-owned JSON config: adding a service means adding a file, not code (MENTAL_MODEL §2.2).
export interface Journey {
  id: string;
  title_en: string;
  title_mr: string;
  title_hi: string;
  description: string;
  category: string;
  required_departments: string[];
  consent_scope: string[];
  default_validity_minutes: number;
  statutory_basis: string;
  reference_prefix: string;
  rules?: Record<string, number>;
  form_fields: FormField[];
}

const CONFIG_DIR = path.join(__dirname, 'journeyConfigs');

const journeys = new Map<string, Journey>(
  fs
    .readdirSync(CONFIG_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const journey: Journey = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8'));
      return [journey.id, journey];
    })
);

export const getJourney = (id: string) => journeys.get(id);
export const listJourneys = () => [...journeys.values()];
