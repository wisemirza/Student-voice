const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let DatabaseSync = null;
function getDatabaseSync() {
  if (!DatabaseSync) {
    const sqliteModule = require('node:sqlite');
    DatabaseSync = sqliteModule.DatabaseSync;
  }
  return DatabaseSync;
}

let sqliteDb = null;
let pgPool = null;
let firestoreDb = null;
let dbEngine = 'sqlite'; // 'firestore' | 'postgresql' | 'sqlite'

function getDeleteWindowMs() {
  const mins = Number(process.env.AUTHOR_DELETE_WINDOW_MINUTES || 60);
  return (Number.isFinite(mins) && mins > 0 ? mins : 60) * 60 * 1000;
}

function computeDeleteMeta(createdAtIso, creatorTokenHash, voterTokenHash) {
  if (!voterTokenHash || !creatorTokenHash || creatorTokenHash !== voterTokenHash) {
    return { can_delete: false, delete_expires_at: null };
  }
  const createdMs = Date.parse(createdAtIso);
  if (!Number.isFinite(createdMs)) {
    return { can_delete: false, delete_expires_at: null };
  }
  const expiresAtMs = createdMs + getDeleteWindowMs();
  if (Date.now() >= expiresAtMs) {
    return { can_delete: false, delete_expires_at: null };
  }
  return {
    can_delete: true,
    delete_expires_at: new Date(expiresAtMs).toISOString()
  };
}

function getSqlitePath() {
  if (process.env.SQLITE_DB_PATH) {
    if (process.env.SQLITE_DB_PATH.trim() === ':memory:') {
      return ':memory:';
    }
    return path.resolve(process.env.SQLITE_DB_PATH);
  }
  return path.resolve(__dirname, '..', 'data', 'student_voice.db');
}

function initFirebaseAdmin() {
  const projectId = (process.env.FIREBASE_PROJECT_ID || 'studio-9101762883-d0a0e').trim();
  const databaseId = (process.env.FIREBASE_DATABASE_ID || 'student-voice-db').trim();

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      let certObj;
      try {
        certObj = JSON.parse(raw);
      } catch (err) {
        try {
          certObj = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        } catch {
          throw new Error(
            'Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON as JSON or base64 JSON: ' + err.message
          );
        }
      }
      if (certObj.private_key) {
        certObj.private_key = certObj.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(certObj),
        projectId: projectId || certObj.project_id
      });
    } else if (
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH &&
      fs.existsSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH))
    ) {
      const certObj = JSON.parse(
        fs.readFileSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH), 'utf8')
      );
      if (certObj.private_key) {
        certObj.private_key = certObj.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(certObj),
        projectId: projectId || certObj.project_id
      });
    } else {
      initializeApp({ projectId });
    }
  }

  if (!firestoreDb) {
    firestoreDb =
      databaseId && databaseId !== '(default)'
        ? getFirestore(getApp(), databaseId)
        : getFirestore(getApp());
  }

  return { engine: 'firestore', projectId, databaseId };
}

async function performInitDb() {
  const isServerless = Boolean(
    process.env.NETLIFY ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  if (process.env.NODE_ENV === 'production' || isServerless) {
    const projectId = (process.env.FIREBASE_PROJECT_ID || 'studio-9101762883-d0a0e').trim();
    if (!projectId) {
      throw new Error(
        'Production configuration error: FIREBASE_PROJECT_ID is required in production. Falling back to local SQLite is disabled in production.'
      );
    }
    const hasServiceAccount =
      Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON &&
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim()
      ) ||
      Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH &&
        fs.existsSync(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH))
      );
    if (!hasServiceAccount) {
      throw new Error(
        'Production configuration error: FIREBASE_SERVICE_ACCOUNT_JSON is required in Netlify production. Falling back to local SQLite is disabled in serverless environments.'
      );
    }
    dbEngine = 'firestore';
    return initFirebaseAdmin();
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PROJECT_ID.trim().length > 0 &&
    process.env.NODE_ENV !== 'test'
  ) {
    dbEngine = 'firestore';
    return initFirebaseAdmin();
  }

  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    dbEngine = 'postgresql';
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL.trim(),
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false }
    });
    const schemaSql = fs.readFileSync(
      path.resolve(__dirname, '..', 'schema', 'postgres_supabase.sql'),
      'utf8'
    );
    await pgPool.query(schemaSql);
    return { engine: 'postgresql' };
  }

  dbEngine = 'sqlite';
  const dbPath = getSqlitePath();
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const DB = getDatabaseSync();
  sqliteDb = new DB(dbPath);
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA busy_timeout = 5000;');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 140),
      description TEXT NOT NULL CHECK (length(trim(description)) >= 4 AND length(description) <= 2000),
      status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'hidden', 'removed')),
      vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
      creator_token_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      voter_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      CONSTRAINT uq_votes_issue_voter UNIQUE (issue_id, voter_token_hash)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      reporter_token_hash TEXT NOT NULL,
      reason TEXT NOT NULL
        CHECK (reason IN ('spam', 'personal_info', 'harassment', 'off_topic', 'other')),
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      CONSTRAINT uq_reports_issue_reporter UNIQUE (issue_id, reporter_token_hash)
    );

    CREATE TABLE IF NOT EXISTS issue_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      target_lang TEXT NOT NULL CHECK (target_lang IN ('en', 'zh-CN')),
      translated_title TEXT NOT NULL DEFAULT '',
      translated_description TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'machine',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      CONSTRAINT uq_issue_translation_lang UNIQUE (issue_id, target_lang)
    );

    CREATE INDEX IF NOT EXISTS idx_issues_status_votes_created
      ON issues (status, vote_count DESC, created_at DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_issues_status_created
      ON issues (status, created_at DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_votes_issue_id ON votes (issue_id);
    CREATE INDEX IF NOT EXISTS idx_votes_voter_token_hash ON votes (voter_token_hash);
    CREATE INDEX IF NOT EXISTS idx_reports_issue_id_status ON reports (issue_id, status);
  `);

  return { engine: 'sqlite', path: dbPath };
}

let initDbPromise = null;

function initDb() {
  if (initDbPromise) {
    return initDbPromise;
  }
  initDbPromise = Promise.resolve()
    .then(() => performInitDb())
    .catch((err) => {
      initDbPromise = null;
      throw err;
    });
  return initDbPromise;
}

function getEngineName() {
  return dbEngine;
}

/**
 * Strip expired creator_token_hash values once the self-delete window passes
 * so older issues cannot be linked back to a browser token.
 */
async function pruneExpiredCreatorHashes() {
  const cutoffIso = new Date(Date.now() - getDeleteWindowMs()).toISOString();

  if (dbEngine === 'firestore') {
    const snap = await firestoreDb
      .collection('issues')
      .where('created_at', '<=', cutoffIso)
      .get();
    const toClear = snap.docs.filter((d) => Boolean(d.data().creator_token_hash));
    if (toClear.length > 0) {
      const batch = firestoreDb.batch();
      toClear.forEach((d) => batch.update(d.ref, { creator_token_hash: null }));
      await batch.commit();
    }
    return;
  }

  if (dbEngine === 'postgresql') {
    await pgPool.query(
      `UPDATE issues SET creator_token_hash = NULL WHERE creator_token_hash IS NOT NULL AND created_at <= $1`,
      [cutoffIso]
    );
    return;
  }

  if (sqliteDb) {
    sqliteDb
      .prepare(
        `UPDATE issues SET creator_token_hash = NULL WHERE creator_token_hash IS NOT NULL AND created_at <= ?`
      )
      .run(cutoffIso);
  }
}

function sortIssuesInMemory(items, sort) {
  return items.sort((a, b) => {
    if (sort !== 'newest' && b.vote_count !== a.vote_count) {
      return b.vote_count - a.vote_count;
    }
    if (b.created_at !== a.created_at) {
      return String(b.created_at).localeCompare(String(a.created_at));
    }
    return b.id - a.id;
  });
}

async function listPublicIssues({ sort = 'popular', voterTokenHash = '' }) {
  // Non-blocking cleanup of expired author hashes
  pruneExpiredCreatorHashes().catch(() => {});

  if (dbEngine === 'firestore') {
    const [issuesSnap, voterVotesSnap] = await Promise.all([
      firestoreDb.collection('issues').where('status', '==', 'active').get(),
      voterTokenHash
        ? firestoreDb.collection('votes').where('voter_token_hash', '==', voterTokenHash).get()
        : Promise.resolve({ docs: [] })
    ]);

    const votedIssueIds = new Set(
      voterVotesSnap.docs.map((d) => Number(d.data().issue_id))
    );

    const items = issuesSnap.docs.map((doc) => {
      const d = doc.data();
      const id = Number(d.id || doc.id);
      const createdAt = d.created_at || new Date().toISOString();
      const delMeta = computeDeleteMeta(createdAt, d.creator_token_hash, voterTokenHash);
      return {
        id,
        title: d.title || '',
        description: d.description || '',
        vote_count: Number(d.vote_count || 0),
        created_at: createdAt,
        has_voted: votedIssueIds.has(id),
        can_delete: delMeta.can_delete,
        delete_expires_at: delMeta.delete_expires_at
      };
    });

    return sortIssuesInMemory(items, sort);
  }

  const orderBy =
    sort === 'newest'
      ? 'i.created_at DESC, i.id DESC'
      : 'i.vote_count DESC, i.created_at DESC, i.id DESC';

  if (dbEngine === 'postgresql') {
    const { rows } = await pgPool.query(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.vote_count,
        i.creator_token_hash,
        i.created_at,
        CASE WHEN v.id IS NOT NULL THEN true ELSE false END AS has_voted
      FROM issues i
      LEFT JOIN votes v
        ON v.issue_id = i.id AND v.voter_token_hash = $1
      WHERE i.status = 'active'
      ORDER BY ${orderBy}
      `,
      [voterTokenHash]
    );
    return rows.map((r) => {
      const createdIso =
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
      const delMeta = computeDeleteMeta(createdIso, r.creator_token_hash, voterTokenHash);
      return {
        id: Number(r.id),
        title: r.title || '',
        description: r.description,
        vote_count: Number(r.vote_count),
        created_at: createdIso,
        has_voted: Boolean(r.has_voted),
        can_delete: delMeta.can_delete,
        delete_expires_at: delMeta.delete_expires_at
      };
    });
  }

  const rows = sqliteDb
    .prepare(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.vote_count,
        i.creator_token_hash,
        i.created_at,
        CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END AS has_voted
      FROM issues i
      LEFT JOIN votes v
        ON v.issue_id = i.id AND v.voter_token_hash = ?
      WHERE i.status = 'active'
      ORDER BY ${orderBy}
      `
    )
    .all(voterTokenHash);

  return rows.map((r) => {
    const delMeta = computeDeleteMeta(r.created_at, r.creator_token_hash, voterTokenHash);
    return {
      id: Number(r.id),
      title: r.title || '',
      description: r.description,
      vote_count: Number(r.vote_count),
      created_at: r.created_at,
      has_voted: Boolean(r.has_voted),
      can_delete: delMeta.can_delete,
      delete_expires_at: delMeta.delete_expires_at
    };
  });
}

async function getIssueById(issueId, voterTokenHash = '') {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id <= 0) return null;

  if (dbEngine === 'firestore') {
    const docSnap = await firestoreDb.collection('issues').doc(String(id)).get();
    if (!docSnap.exists) return null;
    const d = docSnap.data();
    let hasVoted = false;
    if (voterTokenHash) {
      const vSnap = await firestoreDb
        .collection('votes')
        .doc(`${id}_${voterTokenHash}`)
        .get();
      hasVoted = vSnap.exists;
    }
    const delMeta = computeDeleteMeta(d.created_at, d.creator_token_hash, voterTokenHash);
    return {
      id,
      title: d.title || '',
      description: d.description || '',
      status: d.status || 'active',
      vote_count: Number(d.vote_count || 0),
      created_at: d.created_at,
      has_voted: hasVoted,
      can_delete: delMeta.can_delete,
      delete_expires_at: delMeta.delete_expires_at
    };
  }

  if (dbEngine === 'postgresql') {
    const { rows } = await pgPool.query(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.status,
        i.vote_count,
        i.creator_token_hash,
        i.created_at,
        CASE WHEN v.id IS NOT NULL THEN true ELSE false END AS has_voted
      FROM issues i
      LEFT JOIN votes v
        ON v.issue_id = i.id AND v.voter_token_hash = $2
      WHERE i.id = $1
      `,
      [id, voterTokenHash]
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const createdIso =
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
    const delMeta = computeDeleteMeta(createdIso, r.creator_token_hash, voterTokenHash);
    return {
      id: Number(r.id),
      title: r.title || '',
      description: r.description,
      status: r.status,
      vote_count: Number(r.vote_count),
      created_at: createdIso,
      has_voted: Boolean(r.has_voted),
      can_delete: delMeta.can_delete,
      delete_expires_at: delMeta.delete_expires_at
    };
  }

  const row = sqliteDb
    .prepare(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.status,
        i.vote_count,
        i.creator_token_hash,
        i.created_at,
        CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END AS has_voted
      FROM issues i
      LEFT JOIN votes v
        ON v.issue_id = i.id AND v.voter_token_hash = ?
      WHERE i.id = ?
      `
    )
    .get(voterTokenHash, id);

  if (!row) return null;
  const delMeta = computeDeleteMeta(row.created_at, row.creator_token_hash, voterTokenHash);
  return {
    id: Number(row.id),
    title: row.title || '',
    description: row.description,
    status: row.status,
    vote_count: Number(row.vote_count),
    created_at: row.created_at,
    has_voted: Boolean(row.has_voted),
    can_delete: delMeta.can_delete,
    delete_expires_at: delMeta.delete_expires_at
  };
}

async function createIssue({ title = '', description, creatorTokenHash }) {
  const cleanTitle = title || '';

  if (dbEngine === 'firestore') {
    const cutoffIso = new Date(Date.now() - 60 * 1000).toISOString();
    const recentSnap = await firestoreDb
      .collection('issues')
      .where('creator_token_hash', '==', creatorTokenHash)
      .get();

    const isDup = recentSnap.docs.some((doc) => {
      const d = doc.data();
      return (
        d.created_at > cutoffIso &&
        String(d.description || '').toLowerCase() === description.toLowerCase()
      );
    });

    if (isDup) {
      const err = new Error('Duplicate submission detected.');
      err.code = 'DUPLICATE_SUBMISSION';
      throw err;
    }

    const counterRef = firestoreDb.collection('_meta').doc('counters');
    const createdIssue = await firestoreDb.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const nextId = counterSnap.exists ? Number(counterSnap.data().issue_seq || 0) + 1 : 1;
      const nowIso = new Date().toISOString();
      const issueRef = firestoreDb.collection('issues').doc(String(nextId));

      const docData = {
        id: nextId,
        title: cleanTitle,
        description,
        status: 'active',
        vote_count: 0,
        creator_token_hash: creatorTokenHash,
        created_at: nowIso,
        updated_at: nowIso
      };

      tx.set(counterRef, { issue_seq: nextId }, { merge: true });
      tx.set(issueRef, docData);

      const delMeta = computeDeleteMeta(nowIso, creatorTokenHash, creatorTokenHash);
      return {
        id: nextId,
        title: cleanTitle,
        description,
        status: 'active',
        vote_count: 0,
        created_at: nowIso,
        has_voted: false,
        can_delete: delMeta.can_delete,
        delete_expires_at: delMeta.delete_expires_at
      };
    });

    return createdIssue;
  }

  if (dbEngine === 'postgresql') {
    const dupCheck = await pgPool.query(
      `
      SELECT id FROM issues
      WHERE creator_token_hash = $1
        AND lower(description) = lower($2)
        AND created_at > NOW() - INTERVAL '60 seconds'
      LIMIT 1
      `,
      [creatorTokenHash, description]
    );
    if (dupCheck.rows.length > 0) {
      const err = new Error('Duplicate submission detected.');
      err.code = 'DUPLICATE_SUBMISSION';
      throw err;
    }

    const { rows } = await pgPool.query(
      `
      INSERT INTO issues (title, description, creator_token_hash)
      VALUES ($1, $2, $3)
      RETURNING id, title, description, status, vote_count, created_at
      `,
      [cleanTitle, description, creatorTokenHash]
    );
    const r = rows[0];
    const createdIso =
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
    const delMeta = computeDeleteMeta(createdIso, creatorTokenHash, creatorTokenHash);
    return {
      id: Number(r.id),
      title: r.title || '',
      description: r.description,
      vote_count: Number(r.vote_count),
      created_at: createdIso,
      has_voted: false,
      can_delete: delMeta.can_delete,
      delete_expires_at: delMeta.delete_expires_at
    };
  }

  const dup = sqliteDb
    .prepare(
      `
      SELECT id FROM issues
      WHERE creator_token_hash = ?
        AND lower(description) = lower(?)
        AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 seconds')
      LIMIT 1
      `
    )
    .get(creatorTokenHash, description);

  if (dup) {
    const err = new Error('Duplicate submission detected.');
    err.code = 'DUPLICATE_SUBMISSION';
    throw err;
  }

  const nowIso = new Date().toISOString();
  const result = sqliteDb
    .prepare(
      `
      INSERT INTO issues (title, description, creator_token_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(cleanTitle, description, creatorTokenHash, nowIso, nowIso);

  const insertedId = Number(result.lastInsertRowid);
  return getIssueById(insertedId, creatorTokenHash);
}

/**
 * Allow the original author (matched via signed HttpOnly cookie token hash) to
 * delete their own issue strictly within the configured time window (default 1 hour).
 */
async function deleteOwnIssue({ issueId, voterTokenHash }) {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Issue not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const windowMs = getDeleteWindowMs();

  if (dbEngine === 'firestore') {
    const issueRef = firestoreDb.collection('issues').doc(String(id));
    const snap = await issueRef.get();
    if (!snap.exists || snap.data().status !== 'active') {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const data = snap.data();
    if (!voterTokenHash || !data.creator_token_hash || data.creator_token_hash !== voterTokenHash) {
      const err = new Error('You can only delete issues submitted from this browser.');
      err.code = 'FORBIDDEN_NOT_AUTHOR';
      throw err;
    }

    const ageMs = Date.now() - Date.parse(data.created_at);
    if (!Number.isFinite(ageMs) || ageMs > windowMs) {
      await issueRef.update({ creator_token_hash: null }).catch(() => {});
      const err = new Error('The deletion time window for this issue has expired.');
      err.code = 'DELETE_WINDOW_EXPIRED';
      throw err;
    }

    // Delete issue and associated votes, reports, and translations
    const [votesSnap, reportsSnap, transSnap] = await Promise.all([
      firestoreDb.collection('votes').where('issue_id', '==', id).get(),
      firestoreDb.collection('reports').where('issue_id', '==', id).get(),
      firestoreDb.collection('issue_translations').where('issue_id', '==', id).get()
    ]);

    const batch = firestoreDb.batch();
    batch.delete(issueRef);
    votesSnap.docs.forEach((d) => batch.delete(d.ref));
    reportsSnap.docs.forEach((d) => batch.delete(d.ref));
    transSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    return { deleted: true, id };
  }

  if (dbEngine === 'postgresql') {
    const { rows } = await pgPool.query(
      'SELECT id, status, creator_token_hash, created_at FROM issues WHERE id = $1',
      [id]
    );
    const row = rows[0];
    if (!row || row.status !== 'active') {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (!voterTokenHash || !row.creator_token_hash || row.creator_token_hash !== voterTokenHash) {
      const err = new Error('Not authorized to delete this issue.');
      err.code = 'FORBIDDEN_NOT_AUTHOR';
      throw err;
    }
    const createdIso =
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
    const ageMs = Date.now() - Date.parse(createdIso);
    if (!Number.isFinite(ageMs) || ageMs > windowMs) {
      await pgPool.query('UPDATE issues SET creator_token_hash = NULL WHERE id = $1', [id]);
      const err = new Error('Delete window expired.');
      err.code = 'DELETE_WINDOW_EXPIRED';
      throw err;
    }
    await pgPool.query('DELETE FROM issues WHERE id = $1', [id]);
    return { deleted: true, id };
  }

  const row = sqliteDb
    .prepare('SELECT id, status, creator_token_hash, created_at FROM issues WHERE id = ?')
    .get(id);

  if (!row || row.status !== 'active') {
    const err = new Error('Issue not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (!voterTokenHash || !row.creator_token_hash || row.creator_token_hash !== voterTokenHash) {
    const err = new Error('Not authorized to delete this issue.');
    err.code = 'FORBIDDEN_NOT_AUTHOR';
    throw err;
  }

  const ageMs = Date.now() - Date.parse(row.created_at);
  if (!Number.isFinite(ageMs) || ageMs > windowMs) {
    sqliteDb.prepare('UPDATE issues SET creator_token_hash = NULL WHERE id = ?').run(id);
    const err = new Error('Delete window expired.');
    err.code = 'DELETE_WINDOW_EXPIRED';
    throw err;
  }

  sqliteDb.prepare('DELETE FROM issues WHERE id = ?').run(id);
  return { deleted: true, id };
}

/**
 * Atomically record a vote for an issue.
 */
async function castVote({ issueId, voterTokenHash }) {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Invalid issue ID');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (dbEngine === 'firestore') {
    const issueRef = firestoreDb.collection('issues').doc(String(id));
    const voteRef = firestoreDb.collection('votes').doc(`${id}_${voterTokenHash}`);

    return firestoreDb.runTransaction(async (tx) => {
      const [issueSnap, voteSnap] = await Promise.all([
        tx.get(issueRef),
        tx.get(voteRef)
      ]);

      if (!issueSnap.exists || issueSnap.data().status !== 'active') {
        const err = new Error('Issue not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const currentCount = Number(issueSnap.data().vote_count || 0);
      if (voteSnap.exists) {
        return {
          issueId: id,
          alreadyVoted: true,
          voteCount: currentCount,
          hasVoted: true
        };
      }

      const newCount = currentCount + 1;
      const nowIso = new Date().toISOString();
      tx.set(voteRef, {
        issue_id: id,
        voter_token_hash: voterTokenHash,
        created_at: nowIso
      });
      tx.update(issueRef, {
        vote_count: newCount,
        updated_at: nowIso
      });

      return {
        issueId: id,
        alreadyVoted: false,
        voteCount: newCount,
        hasVoted: true
      };
    });
  }

  if (dbEngine === 'postgresql') {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const issueCheck = await client.query(
        'SELECT id, status FROM issues WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!issueCheck.rows[0] || issueCheck.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        const err = new Error('Issue not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const insertRes = await client.query(
        `
        INSERT INTO votes (issue_id, voter_token_hash)
        VALUES ($1, $2)
        ON CONFLICT (issue_id, voter_token_hash) DO NOTHING
        RETURNING id
        `,
        [id, voterTokenHash]
      );

      const alreadyVoted = insertRes.rowCount === 0;

      const countRes = await client.query(
        `
        UPDATE issues
        SET vote_count = (SELECT COUNT(*) FROM votes WHERE issue_id = $1),
            updated_at = NOW()
        WHERE id = $1
        RETURNING vote_count
        `,
        [id]
      );

      await client.query('COMMIT');
      return {
        issueId: id,
        alreadyVoted,
        voteCount: Number(countRes.rows[0].vote_count),
        hasVoted: true
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  sqliteDb.exec('BEGIN IMMEDIATE');
  try {
    const issue = sqliteDb
      .prepare('SELECT id, status FROM issues WHERE id = ?')
      .get(id);

    if (!issue || issue.status !== 'active') {
      sqliteDb.exec('ROLLBACK');
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const insertResult = sqliteDb
      .prepare(
        `
        INSERT INTO votes (issue_id, voter_token_hash)
        VALUES (?, ?)
        ON CONFLICT(issue_id, voter_token_hash) DO NOTHING
        `
      )
      .run(id, voterTokenHash);

    const alreadyVoted = Number(insertResult.changes) === 0;

    sqliteDb
      .prepare(
        `
        UPDATE issues
        SET vote_count = (SELECT COUNT(*) FROM votes WHERE issue_id = ?),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
        `
      )
      .run(id, id);

    const updated = sqliteDb
      .prepare('SELECT vote_count FROM issues WHERE id = ?')
      .get(id);

    sqliteDb.exec('COMMIT');
    return {
      issueId: id,
      alreadyVoted,
      voteCount: Number(updated.vote_count),
      hasVoted: true
    };
  } catch (e) {
    try {
      sqliteDb.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw e;
  }
}

/**
 * Undo / retract an anonymous vote previously cast by this browser.
 */
async function retractVote({ issueId, voterTokenHash }) {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Invalid issue ID');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (dbEngine === 'firestore') {
    const issueRef = firestoreDb.collection('issues').doc(String(id));
    const voteRef = firestoreDb.collection('votes').doc(`${id}_${voterTokenHash}`);

    return firestoreDb.runTransaction(async (tx) => {
      const [issueSnap, voteSnap] = await Promise.all([
        tx.get(issueRef),
        tx.get(voteRef)
      ]);

      if (!issueSnap.exists || issueSnap.data().status !== 'active') {
        const err = new Error('Issue not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const currentCount = Number(issueSnap.data().vote_count || 0);
      if (!voteSnap.exists) {
        return {
          issueId: id,
          voteCount: currentCount,
          hasVoted: false
        };
      }

      const newCount = Math.max(0, currentCount - 1);
      const nowIso = new Date().toISOString();
      tx.delete(voteRef);
      tx.update(issueRef, {
        vote_count: newCount,
        updated_at: nowIso
      });

      return {
        issueId: id,
        voteCount: newCount,
        hasVoted: false
      };
    });
  }

  if (dbEngine === 'postgresql') {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const issueCheck = await client.query(
        'SELECT id, status FROM issues WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!issueCheck.rows[0] || issueCheck.rows[0].status !== 'active') {
        await client.query('ROLLBACK');
        const err = new Error('Issue not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      await client.query(
        'DELETE FROM votes WHERE issue_id = $1 AND voter_token_hash = $2',
        [id, voterTokenHash]
      );

      const countRes = await client.query(
        `
        UPDATE issues
        SET vote_count = (SELECT COUNT(*) FROM votes WHERE issue_id = $1),
            updated_at = NOW()
        WHERE id = $1
        RETURNING vote_count
        `,
        [id]
      );

      await client.query('COMMIT');
      return {
        issueId: id,
        voteCount: Number(countRes.rows[0].vote_count),
        hasVoted: false
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  sqliteDb.exec('BEGIN IMMEDIATE');
  try {
    const issue = sqliteDb
      .prepare('SELECT id, status FROM issues WHERE id = ?')
      .get(id);

    if (!issue || issue.status !== 'active') {
      sqliteDb.exec('ROLLBACK');
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    sqliteDb
      .prepare('DELETE FROM votes WHERE issue_id = ? AND voter_token_hash = ?')
      .run(id, voterTokenHash);

    sqliteDb
      .prepare(
        `
        UPDATE issues
        SET vote_count = (SELECT COUNT(*) FROM votes WHERE issue_id = ?),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
        `
      )
      .run(id, id);

    const updated = sqliteDb
      .prepare('SELECT vote_count FROM issues WHERE id = ?')
      .get(id);

    sqliteDb.exec('COMMIT');
    return {
      issueId: id,
      voteCount: Number(updated.vote_count),
      hasVoted: false
    };
  } catch (e) {
    try {
      sqliteDb.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw e;
  }
}

async function createReport({ issueId, reporterTokenHash, reason, details }) {
  const id = Number(issueId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Issue not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (dbEngine === 'firestore') {
    const issueSnap = await firestoreDb.collection('issues').doc(String(id)).get();
    if (!issueSnap.exists || issueSnap.data().status !== 'active') {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const nowIso = new Date().toISOString();
    await firestoreDb
      .collection('reports')
      .doc(`${id}_${reporterTokenHash}`)
      .set({
        issue_id: id,
        reporter_token_hash: reporterTokenHash,
        reason,
        details: details || '',
        status: 'open',
        created_at: nowIso
      });
    return { reported: true };
  }

  if (dbEngine === 'postgresql') {
    const issueCheck = await pgPool.query(
      'SELECT id FROM issues WHERE id = $1 AND status = $2',
      [id, 'active']
    );
    if (!issueCheck.rows[0]) {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    await pgPool.query(
      `
      INSERT INTO reports (issue_id, reporter_token_hash, reason, details, status)
      VALUES ($1, $2, $3, $4, 'open')
      ON CONFLICT (issue_id, reporter_token_hash)
      DO UPDATE SET reason = EXCLUDED.reason, details = EXCLUDED.details, status = 'open', created_at = NOW()
      `,
      [id, reporterTokenHash, reason, details]
    );
    return { reported: true };
  }

  const issue = sqliteDb
    .prepare('SELECT id FROM issues WHERE id = ? AND status = ?')
    .get(id, 'active');

  if (!issue) {
    const err = new Error('Issue not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  sqliteDb
    .prepare(
      `
      INSERT INTO reports (issue_id, reporter_token_hash, reason, details, status)
      VALUES (?, ?, ?, ?, 'open')
      ON CONFLICT(issue_id, reporter_token_hash)
      DO UPDATE SET
        reason = excluded.reason,
        details = excluded.details,
        status = 'open',
        created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `
    )
    .run(id, reporterTokenHash, reason, details);

  return { reported: true };
}

async function getCachedTranslationsForLang(issueIds, targetLang) {
  const map = new Map();
  if (!issueIds || issueIds.length === 0) return map;

  if (dbEngine === 'firestore') {
    const refs = issueIds.map((id) =>
      firestoreDb.collection('issue_translations').doc(`${id}_${targetLang}`)
    );
    const snaps = await firestoreDb.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) {
        const d = snap.data();
        map.set(Number(d.issue_id), {
          translated_title: d.translated_title || '',
          translated_description: d.translated_description || '',
          provider: d.provider || 'machine'
        });
      }
    });
    return map;
  }

  if (dbEngine === 'postgresql') {
    const { rows } = await pgPool.query(
      `
      SELECT issue_id, translated_title, translated_description, provider
      FROM issue_translations
      WHERE target_lang = $1 AND issue_id = ANY($2::bigint[])
      `,
      [targetLang, issueIds]
    );
    rows.forEach((r) => {
      map.set(Number(r.issue_id), r);
    });
    return map;
  }

  const placeholders = issueIds.map(() => '?').join(',');
  const rows = sqliteDb
    .prepare(
      `
      SELECT issue_id, translated_title, translated_description, provider
      FROM issue_translations
      WHERE target_lang = ? AND issue_id IN (${placeholders})
      `
    )
    .all(targetLang, ...issueIds);

  rows.forEach((r) => {
    map.set(Number(r.issue_id), r);
  });
  return map;
}

async function getCachedTranslation(issueId, targetLang) {
  const id = Number(issueId);
  if (dbEngine === 'firestore') {
    const snap = await firestoreDb
      .collection('issue_translations')
      .doc(`${id}_${targetLang}`)
      .get();
    return snap.exists ? snap.data() : null;
  }

  if (dbEngine === 'postgresql') {
    const { rows } = await pgPool.query(
      `
      SELECT translated_title, translated_description, provider, created_at
      FROM issue_translations
      WHERE issue_id = $1 AND target_lang = $2
      `,
      [id, targetLang]
    );
    return rows[0] || null;
  }

  return (
    sqliteDb
      .prepare(
        `
        SELECT translated_title, translated_description, provider, created_at
        FROM issue_translations
        WHERE issue_id = ? AND target_lang = ?
        `
      )
      .get(id, targetLang) || null
  );
}

async function saveCachedTranslation({
  issueId,
  targetLang,
  translatedTitle = '',
  translatedDescription,
  provider
}) {
  const id = Number(issueId);
  if (dbEngine === 'firestore') {
    await firestoreDb
      .collection('issue_translations')
      .doc(`${id}_${targetLang}`)
      .set({
        issue_id: id,
        target_lang: targetLang,
        translated_title: translatedTitle || '',
        translated_description: translatedDescription,
        provider: provider || 'machine',
        created_at: new Date().toISOString()
      });
    return;
  }

  if (dbEngine === 'postgresql') {
    await pgPool.query(
      `
      INSERT INTO issue_translations (issue_id, target_lang, translated_title, translated_description, provider)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (issue_id, target_lang)
      DO UPDATE SET
        translated_title = EXCLUDED.translated_title,
        translated_description = EXCLUDED.translated_description,
        provider = EXCLUDED.provider,
        created_at = NOW()
      `,
      [id, targetLang, translatedTitle || '', translatedDescription, provider]
    );
    return;
  }

  sqliteDb
    .prepare(
      `
      INSERT INTO issue_translations (issue_id, target_lang, translated_title, translated_description, provider)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(issue_id, target_lang)
      DO UPDATE SET
        translated_title = excluded.translated_title,
        translated_description = excluded.translated_description,
        provider = excluded.provider,
        created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `
    )
    .run(id, targetLang, translatedTitle || '', translatedDescription, provider);
}

async function listAdminIssues({ statusFilter = 'all' } = {}) {
  if (dbEngine === 'firestore') {
    const [issuesSnap, reportsSnap] = await Promise.all([
      firestoreDb.collection('issues').get(),
      firestoreDb.collection('reports').get()
    ]);

    const reportsByIssue = new Map();
    reportsSnap.docs.forEach((doc) => {
      const r = doc.data();
      const issueId = Number(r.issue_id);
      const list = reportsByIssue.get(issueId) || [];
      list.push({
        id: doc.id,
        reason: r.reason,
        details: r.details || '',
        status: r.status || 'open',
        created_at: r.created_at
      });
      reportsByIssue.set(issueId, list);
    });

    let allIssues = issuesSnap.docs.map((doc) => {
      const d = doc.data();
      const id = Number(d.id || doc.id);
      const reps = (reportsByIssue.get(id) || []).sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at))
      );
      const openCount = reps.filter((r) => r.status === 'open').length;
      return {
        id,
        title: d.title || '',
        description: d.description || '',
        status: d.status || 'active',
        vote_count: Number(d.vote_count || 0),
        created_at: d.created_at,
        open_report_count: openCount,
        total_report_count: reps.length,
        reports: reps
      };
    });

    if (statusFilter === 'reported') {
      allIssues = allIssues.filter((i) => i.open_report_count > 0);
    } else if (['active', 'hidden', 'removed'].includes(statusFilter)) {
      allIssues = allIssues.filter((i) => i.status === statusFilter);
    }

    return allIssues.sort((a, b) => {
      if (b.open_report_count !== a.open_report_count) {
        return b.open_report_count - a.open_report_count;
      }
      if (b.created_at !== a.created_at) {
        return String(b.created_at).localeCompare(String(a.created_at));
      }
      return b.id - a.id;
    });
  }

  if (dbEngine === 'postgresql') {
    const params = [];
    let whereClause = '';
    if (statusFilter === 'reported') {
      whereClause = `WHERE EXISTS (SELECT 1 FROM reports r WHERE r.issue_id = i.id AND r.status = 'open')`;
    } else if (['active', 'hidden', 'removed'].includes(statusFilter)) {
      params.push(statusFilter);
      whereClause = `WHERE i.status = $1`;
    }

    const { rows: issues } = await pgPool.query(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.status,
        i.vote_count,
        i.created_at,
        (SELECT COUNT(*) FROM reports r WHERE r.issue_id = i.id AND r.status = 'open') AS open_report_count,
        (SELECT COUNT(*) FROM reports r WHERE r.issue_id = i.id) AS total_report_count
      FROM issues i
      ${whereClause}
      ORDER BY open_report_count DESC, i.created_at DESC, i.id DESC
      `,
      params
    );

    const { rows: allReports } = await pgPool.query(
      `SELECT id, issue_id, reason, details, status, created_at FROM reports ORDER BY created_at DESC`
    );

    const reportsByIssue = new Map();
    for (const rep of allReports) {
      const list = reportsByIssue.get(Number(rep.issue_id)) || [];
      list.push({
        id: Number(rep.id),
        reason: rep.reason,
        details: rep.details,
        status: rep.status,
        created_at:
          rep.created_at instanceof Date ? rep.created_at.toISOString() : String(rep.created_at)
      });
      reportsByIssue.set(Number(rep.issue_id), list);
    }

    return issues.map((i) => ({
      id: Number(i.id),
      title: i.title || '',
      description: i.description,
      status: i.status,
      vote_count: Number(i.vote_count),
      created_at:
        i.created_at instanceof Date ? i.created_at.toISOString() : String(i.created_at),
      open_report_count: Number(i.open_report_count),
      total_report_count: Number(i.total_report_count),
      reports: reportsByIssue.get(Number(i.id)) || []
    }));
  }

  const params = [];
  let whereClause = '';
  if (statusFilter === 'reported') {
    whereClause = `WHERE EXISTS (SELECT 1 FROM reports r WHERE r.issue_id = i.id AND r.status = 'open')`;
  } else if (['active', 'hidden', 'removed'].includes(statusFilter)) {
    params.push(statusFilter);
    whereClause = `WHERE i.status = ?`;
  }

  const issues = sqliteDb
    .prepare(
      `
      SELECT
        i.id,
        i.title,
        i.description,
        i.status,
        i.vote_count,
        i.created_at,
        (SELECT COUNT(*) FROM reports r WHERE r.issue_id = i.id AND r.status = 'open') AS open_report_count,
        (SELECT COUNT(*) FROM reports r WHERE r.issue_id = i.id) AS total_report_count
      FROM issues i
      ${whereClause}
      ORDER BY open_report_count DESC, i.created_at DESC, i.id DESC
      `
    )
    .all(...params);

  const allReports = sqliteDb
    .prepare(
      `SELECT id, issue_id, reason, details, status, created_at FROM reports ORDER BY created_at DESC`
    )
    .all();

  const reportsByIssue = new Map();
  for (const rep of allReports) {
    const list = reportsByIssue.get(Number(rep.issue_id)) || [];
    list.push({
      id: Number(rep.id),
      reason: rep.reason,
      details: rep.details,
      status: rep.status,
      created_at: rep.created_at
    });
    reportsByIssue.set(Number(rep.issue_id), list);
  }

  return issues.map((i) => ({
    id: Number(i.id),
    title: i.title || '',
    description: i.description,
    status: i.status,
    vote_count: Number(i.vote_count),
    created_at: i.created_at,
    open_report_count: Number(i.open_report_count),
    total_report_count: Number(i.total_report_count),
    reports: reportsByIssue.get(Number(i.id)) || []
  }));
}

async function updateIssueStatus({ issueId, status }) {
  const id = Number(issueId);
  if (!['active', 'hidden', 'removed'].includes(status)) {
    const err = new Error('Invalid status');
    err.code = 'INVALID_STATUS';
    throw err;
  }

  if (dbEngine === 'firestore') {
    const docRef = firestoreDb.collection('issues').doc(String(id));
    const snap = await docRef.get();
    if (!snap.exists) {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    await docRef.update({
      status,
      updated_at: new Date().toISOString()
    });
    return { id, status };
  }

  if (dbEngine === 'postgresql') {
    const res = await pgPool.query(
      `UPDATE issues SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status`,
      [status, id]
    );
    if (!res.rows[0]) {
      const err = new Error('Issue not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return res.rows[0];
  }

  const res = sqliteDb
    .prepare(
      `UPDATE issues SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
    )
    .run(status, id);

  if (Number(res.changes) === 0) {
    const err = new Error('Issue not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { id, status };
}

async function resolveReportsForIssue(issueId) {
  const id = Number(issueId);
  if (dbEngine === 'firestore') {
    const snaps = await firestoreDb
      .collection('reports')
      .where('issue_id', '==', id)
      .where('status', '==', 'open')
      .get();
    const batch = firestoreDb.batch();
    snaps.docs.forEach((doc) => {
      batch.update(doc.ref, { status: 'resolved' });
    });
    await batch.commit();
    return { resolved: true };
  }

  if (dbEngine === 'postgresql') {
    await pgPool.query(`UPDATE reports SET status = 'resolved' WHERE issue_id = $1`, [id]);
    return { resolved: true };
  }

  sqliteDb.prepare(`UPDATE reports SET status = 'resolved' WHERE issue_id = ?`).run(id);
  return { resolved: true };
}

async function closeDb() {
  initDbPromise = null;
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
}

module.exports = {
  initDb,
  getEngineName,
  getDeleteWindowMs,
  listPublicIssues,
  getIssueById,
  createIssue,
  deleteOwnIssue,
  castVote,
  retractVote,
  createReport,
  getCachedTranslation,
  getCachedTranslationsForLang,
  saveCachedTranslation,
  listAdminIssues,
  updateIssueStatus,
  resolveReportsForIssue,
  closeDb
};
