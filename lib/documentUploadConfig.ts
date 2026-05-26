export type DocumentUploadConfig = {
  success: boolean;
  mode: 'blob' | 'filesystem';
  accept: string;
  limits: {
    maxFileBytes: number;
    maxFiles: number;
    maxBatchBytes: number;
    retentionHours: number;
  };
};

export const DEFAULT_DOCUMENT_UPLOAD_CONFIG: DocumentUploadConfig = {
  success: true,
  mode: 'filesystem',
  accept: '.pdf,.docx,.epub,.txt,.md,.html,.htm,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.rst',
  limits: {
    maxFileBytes: 60 * 1024 * 1024,
    maxFiles: 500,
    maxBatchBytes: 2 * 1024 * 1024 * 1024,
    retentionHours: 24,
  },
};

export type DocumentUploadConfigGate = {
  ensureReady: () => Promise<DocumentUploadConfig>;
  getCurrent: () => DocumentUploadConfig;
  isReady: () => boolean;
  markReady: (config: DocumentUploadConfig) => void;
};

export function createDocumentUploadConfigGate(
  loadConfig: () => Promise<DocumentUploadConfig>,
  initialConfig: DocumentUploadConfig = DEFAULT_DOCUMENT_UPLOAD_CONFIG,
): DocumentUploadConfigGate {
  let current = initialConfig;
  let ready = false;
  let pending: Promise<DocumentUploadConfig> | null = null;

  return {
    async ensureReady(): Promise<DocumentUploadConfig> {
      if (ready) return current;
      if (!pending) {
        pending = loadConfig()
          .then((config) => {
            current = config;
            ready = true;
            return current;
          })
          .catch((error) => {
            pending = null;
            throw error;
          });
      }
      return pending;
    },
    getCurrent(): DocumentUploadConfig {
      return current;
    },
    isReady(): boolean {
      return ready;
    },
    markReady(config: DocumentUploadConfig): void {
      current = config;
      ready = true;
    },
  };
}
