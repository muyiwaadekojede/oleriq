import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const LEGACY_BRAND_SLUG = ['clear', 'page'].join('');

export function resolveDataDir(): string {
  const custom =
    process.env.OLERIQ_DATA_DIR?.trim() ||
    process.env.CLEARPAGE_DATA_DIR?.trim();
  if (custom) return custom;

  if (process.env.VERCEL) {
    return path.join('/tmp', 'oleriq-data');
  }

  return path.join(process.cwd(), 'data');
}

function resolveDatabasePath(dataDir: string): string {
  return path.join(dataDir, 'oleriq.db');
}

function resolveLegacyDatabasePath(dataDir: string): string {
  return path.join(dataDir, `${LEGACY_BRAND_SLUG}.db`);
}

function databaseSidecarPaths(filePath: string): string[] {
  return [`${filePath}-wal`, `${filePath}-shm`];
}

function replaceFileIfPresent(sourcePath: string, targetPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
    return;
  }

  fs.copyFileSync(sourcePath, targetPath);
}

function isDatabaseUsable(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;

  try {
    const probe = new Database(filePath, { readonly: true });
    probe.prepare("SELECT name FROM sqlite_master WHERE type = 'table' LIMIT 1").all();
    probe.close();
    return true;
  } catch {
    return false;
  }
}

function copyDatabaseFileSet(sourceFilePath: string, targetFilePath: string): void {
  fs.copyFileSync(sourceFilePath, targetFilePath);
  const targetSidecars = databaseSidecarPaths(targetFilePath);
  const sourceSidecars = databaseSidecarPaths(sourceFilePath);
  for (let index = 0; index < sourceSidecars.length; index += 1) {
    replaceFileIfPresent(sourceSidecars[index], targetSidecars[index]);
  }
}

function promoteLegacyDatabaseFile(dataDir: string): void {
  const filePath = resolveDatabasePath(dataDir);
  const legacyFilePath = resolveLegacyDatabasePath(dataDir);

  if (!fs.existsSync(legacyFilePath)) {
    return;
  }

  try {
    if (!fs.existsSync(filePath)) {
      copyDatabaseFileSet(legacyFilePath, filePath);
      return;
    }

    const fileStat = fs.statSync(filePath);
    const legacyStat = fs.statSync(legacyFilePath);
    const targetUsable = isDatabaseUsable(filePath);
    const legacyUsable = isDatabaseUsable(legacyFilePath);

    if (!targetUsable && legacyUsable) {
      copyDatabaseFileSet(legacyFilePath, filePath);
      return;
    }

    if (legacyUsable && legacyStat.size > fileStat.size) {
      copyDatabaseFileSet(legacyFilePath, filePath);
    }
  } catch {
    // If promotion fails, opening either database remains the fallback path.
  }
}

function openSqliteDatabase(filePath: string): Database.Database {
  const fileDb = new Database(filePath);
  try {
    fileDb.pragma('journal_mode = WAL');
  } catch {
    // Some runtimes/filesystems do not support WAL.
  }
  return fileDb;
}

function openDatabase(): Database.Database {
  const dataDir = resolveDataDir();

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    promoteLegacyDatabaseFile(dataDir);
    const filePath = resolveDatabasePath(dataDir);
    const legacyFilePath = resolveLegacyDatabasePath(dataDir);
    const targetPath = isDatabaseUsable(filePath)
      ? filePath
      : isDatabaseUsable(legacyFilePath)
        ? legacyFilePath
        : filePath;

    try {
      return openSqliteDatabase(targetPath);
    } catch (error) {
      if (targetPath !== legacyFilePath && fs.existsSync(legacyFilePath)) {
        return openSqliteDatabase(legacyFilePath);
      }
      throw error;
    }
  } catch (error) {
    console.error('Database file initialization failed, falling back to in-memory DB:', error);
    return new Database(':memory:');
  }
}

const db = openDatabase();

function hasColumn(tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  if (hasColumn(tableName, columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    failed_url TEXT,
    error_code TEXT,
    checked_reasons TEXT,
    free_text TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_sessions (
    session_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    landing_page TEXT,
    landing_referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    first_user_agent TEXT,
    first_ip TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_time TEXT NOT NULL,
    session_id TEXT,
    event_name TEXT NOT NULL,
    event_group TEXT,
    status TEXT,
    page_path TEXT,
    attempted_url TEXT,
    source_url TEXT,
    export_format TEXT,
    error_code TEXT,
    error_message TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    user_agent TEXT,
    ip_address TEXT,
    metadata TEXT
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_time
  ON analytics_events(event_time DESC)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events(session_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_name
  ON analytics_events(event_name)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_status
  ON analytics_events(status)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_analytics_events_error_code
  ON analytics_events(error_code)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS public_conversion_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_time TEXT NOT NULL,
    session_id TEXT,
    source_surface TEXT NOT NULL,
    conversion_kind TEXT NOT NULL,
    export_format TEXT,
    metadata TEXT
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_public_conversion_events_time
  ON public_conversion_events(event_time DESC)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_public_conversion_events_session
  ON public_conversion_events(session_id)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_public_conversion_events_kind
  ON public_conversion_events(conversion_kind)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS public_proof_snapshots (
    metric_key TEXT PRIMARY KEY,
    metric_value INTEGER NOT NULL,
    label TEXT NOT NULL,
    published_at TEXT NOT NULL,
    next_refresh_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS authenticated_sessions (
    id TEXT PRIMARY KEY,
    owner_session_id TEXT NOT NULL,
    label TEXT NOT NULL,
    import_kind TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL,
    allowed_domain_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_used_at TEXT,
    last_health_state TEXT NOT NULL
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_authenticated_sessions_owner
  ON authenticated_sessions(owner_session_id, created_at DESC)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_authenticated_sessions_expires
  ON authenticated_sessions(expires_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_authenticated_sessions_last_used
  ON authenticated_sessions(last_used_at DESC)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS batch_jobs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    auth_session_id TEXT,
    status TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'queued',
    input_mode TEXT NOT NULL DEFAULT 'url',
    export_format TEXT NOT NULL,
    images_mode TEXT NOT NULL,
    settings_json TEXT,
    total_urls INTEGER NOT NULL,
    processed_urls INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    average_duration_ms INTEGER,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    last_error_code TEXT,
    last_error_message TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS batch_job_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    extraction_id TEXT,
    source_url TEXT,
    title TEXT,
    original_filename TEXT,
    content_type TEXT,
    byte_size INTEGER,
    source_object_key TEXT,
    processing_lane TEXT,
    confidence_score REAL,
    escalated INTEGER NOT NULL DEFAULT 0,
    page_count INTEGER,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    output_object_key TEXT,
    output_filename TEXT,
    output_format TEXT,
    error_code TEXT,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY(job_id) REFERENCES batch_jobs(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS batch_uploads (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    object_key TEXT NOT NULL,
    object_url TEXT,
    download_url TEXT,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`);

ensureColumn('batch_jobs', 'auth_session_id', 'TEXT');
ensureColumn('batch_jobs', 'phase', "TEXT NOT NULL DEFAULT 'queued'");
ensureColumn('batch_jobs', 'input_mode', "TEXT NOT NULL DEFAULT 'url'");
ensureColumn('batch_job_items', 'original_filename', 'TEXT');
ensureColumn('batch_job_items', 'content_type', 'TEXT');
ensureColumn('batch_job_items', 'byte_size', 'INTEGER');
ensureColumn('batch_job_items', 'source_object_key', 'TEXT');
ensureColumn('batch_job_items', 'processing_lane', 'TEXT');
ensureColumn('batch_job_items', 'confidence_score', 'REAL');
ensureColumn('batch_job_items', 'escalated', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('batch_job_items', 'page_count', 'INTEGER');
ensureColumn('batch_job_items', 'attempt_count', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('batch_job_items', 'output_object_key', 'TEXT');
ensureColumn('batch_job_items', 'output_filename', 'TEXT');
ensureColumn('batch_job_items', 'output_format', 'TEXT');
ensureColumn('batch_job_items', 'quality_state', 'TEXT');
ensureColumn('batch_job_items', 'warning_json', 'TEXT');
ensureColumn('batch_job_items', 'diagnostic_reason_json', 'TEXT');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_batch_jobs_status_created
  ON batch_jobs(status, created_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_batch_items_job_position
  ON batch_job_items(job_id, position)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_batch_items_job_status
  ON batch_job_items(job_id, status)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_batch_uploads_created
  ON batch_uploads(created_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_batch_uploads_session
  ON batch_uploads(session_id, created_at)
`);

export default db;
