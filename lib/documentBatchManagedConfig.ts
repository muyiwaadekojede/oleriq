export type ManagedDocumentBatchConfig = {
  enabled: boolean;
  postgresUrl: string | null;
  redisUrl: string | null;
  documentIntelligence: {
    endpoint: string | null;
    key: string | null;
  };
  missingRequirements: string[];
};

const REQUIRED_KEYS = [
  'OLERIQ_DOCUMENT_BATCH_POSTGRES_URL',
  'OLERIQ_DOCUMENT_BATCH_REDIS_URL',
  'OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT',
  'OLERIQ_DOCUMENT_INTELLIGENCE_KEY',
] as const;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function resolveManagedDocumentBatchConfig(): ManagedDocumentBatchConfig {
  const postgresUrl = readEnv('OLERIQ_DOCUMENT_BATCH_POSTGRES_URL');
  const redisUrl = readEnv('OLERIQ_DOCUMENT_BATCH_REDIS_URL');
  const endpoint = readEnv('OLERIQ_DOCUMENT_INTELLIGENCE_ENDPOINT');
  const key = readEnv('OLERIQ_DOCUMENT_INTELLIGENCE_KEY');

  const missingRequirements = REQUIRED_KEYS.filter((name) => !readEnv(name));

  return {
    enabled: missingRequirements.length === 0,
    postgresUrl,
    redisUrl,
    documentIntelligence: {
      endpoint,
      key,
    },
    missingRequirements: [...missingRequirements],
  };
}

export function isManagedDocumentBatchEnabled(): boolean {
  return resolveManagedDocumentBatchConfig().enabled;
}
