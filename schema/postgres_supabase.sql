-- ============================================================================
-- UWE Bristol "Student Voice" - PostgreSQL / Supabase Database Schema
-- ============================================================================
-- Includes tables for Issues, Votes, Reports, and Cached Translations,
-- with primary keys, foreign keys, check constraints, unique constraints,
-- indexes, and Row-Level Security (RLS) policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS issues (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(140) NOT NULL CHECK (char_length(trim(title)) >= 5),
  description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10 AND char_length(description) <= 2000),
  category VARCHAR(32) NOT NULL DEFAULT 'Other'
    CHECK (category IN ('Teaching', 'Assessment', 'Timetables', 'Communication', 'Facilities', 'Other')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden', 'removed')),
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0),
  creator_token_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  voter_token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_votes_issue_voter UNIQUE (issue_id, voter_token_hash)
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  reporter_token_hash CHAR(64) NOT NULL,
  reason VARCHAR(64) NOT NULL
    CHECK (reason IN ('spam', 'personal_info', 'harassment', 'off_topic', 'other')),
  details VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reports_issue_reporter UNIQUE (issue_id, reporter_token_hash)
);

CREATE TABLE IF NOT EXISTS issue_translations (
  id BIGSERIAL PRIMARY KEY,
  issue_id BIGINT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  target_lang VARCHAR(10) NOT NULL CHECK (target_lang IN ('en', 'zh-CN')),
  translated_title TEXT NOT NULL,
  translated_description TEXT NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'machine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_issue_translation_lang UNIQUE (issue_id, target_lang)
);

-- Indexes for fast sorting and filtering
CREATE INDEX IF NOT EXISTS idx_issues_status_votes_created
  ON issues (status, vote_count DESC, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_issues_status_created
  ON issues (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_votes_issue_id ON votes (issue_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_token_hash ON votes (voter_token_hash);
CREATE INDEX IF NOT EXISTS idx_reports_issue_id_status ON reports (issue_id, status);

-- Enable Row-Level Security (RLS) so direct public PostgREST access in Supabase
-- is locked down and all mutations go through the authenticated backend service.
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_translations ENABLE ROW LEVEL SECURITY;
