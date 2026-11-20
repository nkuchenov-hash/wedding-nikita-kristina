PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY, login TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Организатор', disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL, side TEXT NOT NULL DEFAULT 'other',
  relationship TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
  email TEXT, phone TEXT, language TEXT NOT NULL DEFAULT 'ru',
  about TEXT NOT NULL DEFAULT '', about_en TEXT NOT NULL DEFAULT '', community TEXT NOT NULL DEFAULT '', private_notes TEXT NOT NULL DEFAULT '',
  planning_status TEXT NOT NULL DEFAULT 'main' CHECK(planning_status IN ('main','reserve')),
  age_group TEXT NOT NULL DEFAULT 'unknown' CHECK(age_group IN ('unknown','adult','child','infant')),
  profile_visible INTEGER NOT NULL DEFAULT 0,
  consent_at TEXT, invited INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','invited','registered','archived')),
  plus_one_allowed INTEGER NOT NULL DEFAULT 0, children_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_guests_side ON guests(side);
-- idx_guests_planning_age is created by migrate.php after older guest tables gain both columns.
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(display_name);
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, expires_at TEXT,
  used_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invitations_guest ON invitations(guest_id);
CREATE TABLE IF NOT EXISTS guest_companions (
  id TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL, age_group TEXT NOT NULL DEFAULT 'adult'
    CHECK(age_group IN ('adult','child','infant')), attendance TEXT NOT NULL DEFAULT 'unknown',
  dietary_notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rsvps (
  guest_id TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
  attendance TEXT NOT NULL CHECK(attendance IN ('yes','no','maybe')),
  adults INTEGER NOT NULL DEFAULT 1 CHECK(adults BETWEEN 0 AND 15),
  children INTEGER NOT NULL DEFAULT 0 CHECK(children BETWEEN 0 AND 15),
  transport_needed INTEGER NOT NULL DEFAULT 0, arrival_notes TEXT NOT NULL DEFAULT '',
  dietary_notes TEXT NOT NULL DEFAULT '', other_notes TEXT NOT NULL DEFAULT '',
  response_source TEXT NOT NULL DEFAULT 'guest' CHECK(response_source IN ('guest','admin')),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS menu_options (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', allergens TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS menu_choices (
  guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  category TEXT NOT NULL, option_id TEXT NOT NULL REFERENCES menu_options(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(guest_id, category)
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  filename TEXT NOT NULL UNIQUE, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, sha256 TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY, guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS event_settings (
  key TEXT PRIMARY KEY, value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  capacity_min INTEGER, capacity_max INTEGER, quoted_total_rub INTEGER, quote_guests INTEGER,
  desired_date_status TEXT NOT NULL DEFAULT 'unknown',
  contact_name TEXT NOT NULL DEFAULT '', contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '', quote_source TEXT NOT NULL DEFAULT '',
  pros TEXT NOT NULL DEFAULT '', cons TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  details_json TEXT NOT NULL DEFAULT '{}', photo_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Authoritative availability: one row per venue and calendar day.
-- Never overwrite these organizer-edited rows during source-code deployment.
CREATE TABLE IF NOT EXISTS venue_date_status (
  venue_id TEXT NOT NULL,
  day TEXT NOT NULL CHECK(day IN ('2027-06-18','2027-06-19','2027-06-20')),
  status TEXT NOT NULL DEFAULT 'unknown'
    CHECK(status IN ('unknown','pending','available','unavailable')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (venue_id,day)
);
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'candidate', estimate_rub INTEGER,
  contract_ref TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS budget_lines (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, description TEXT NOT NULL,
  planned_rub INTEGER NOT NULL DEFAULT 0, committed_rub INTEGER NOT NULL DEFAULT 0,
  paid_rub INTEGER NOT NULL DEFAULT 0, due_at TEXT, vendor_id TEXT REFERENCES vendors(id),
  notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'normal',
  owner TEXT NOT NULL DEFAULT '', due_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, start_at TEXT, end_at TEXT,
  place TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  is_public INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
  venue_id TEXT NOT NULL DEFAULT '', is_confirmed INTEGER NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'idea', activity_type TEXT NOT NULL DEFAULT 'other',
  duration_min INTEGER NOT NULL DEFAULT 30, gap_before_min INTEGER NOT NULL DEFAULT 0,
  activity_date TEXT NOT NULL DEFAULT '2027-06-19', tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, category TEXT NOT NULL, label TEXT NOT NULL, reference TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'admin', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY, filename TEXT NOT NULL, row_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actor_type TEXT NOT NULL, actor_id TEXT NOT NULL,
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE TABLE IF NOT EXISTS throttle (
  key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);


-- Imported guest profile and relationship metadata, stored privately with the guest table.
CREATE TABLE IF NOT EXISTS guest_profile_details (
  guest_id TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
  source_person_id TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL DEFAULT '',
  relation_to_couple TEXT NOT NULL DEFAULT '',
  source_people_json TEXT NOT NULL DEFAULT '{}',
  source_invitation_json TEXT NOT NULL DEFAULT '{}',
  source_profile_json TEXT NOT NULL DEFAULT '{}',
  source_english_json TEXT NOT NULL DEFAULT '{}',
  seating_group TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT '',
  base_count TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS guest_relationships (
  id TEXT PRIMARY KEY,
  guest_id_1 TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest_id_2 TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  relation_1_to_2 TEXT NOT NULL DEFAULT '',
  relation_2_to_1 TEXT NOT NULL DEFAULT '',
  relation_type TEXT NOT NULL DEFAULT '',
  source_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS guest_relationships_member_1 ON guest_relationships(guest_id_1);
CREATE INDEX IF NOT EXISTS guest_relationships_member_2 ON guest_relationships(guest_id_2);


CREATE TABLE IF NOT EXISTS venue_files(
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mime TEXT NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  source_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('document','video','archive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_venue_files_venue ON venue_files(venue_id,type);

-- Organizer invitation tracking: issued is not sent; opened is not registered.
-- Consent and the actual RSVP are separate from completing a profile.
CREATE TABLE IF NOT EXISTS guest_progress (
  guest_id TEXT PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
  invitation_sent_at TEXT,
  first_opened_at TEXT,
  last_opened_at TEXT,
  profile_completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS guest_progress_profile_completed ON guest_progress(profile_completed_at);

-- Single wedding gallery for organizer photos, confirmed locations and guides.
-- Research photos remain exclusively in their respective venue detail cards.
CREATE TABLE IF NOT EXISTS gallery_assets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('couple','location','city','guide')),
  venue_id TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  bytes INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gallery_assets_category ON gallery_assets(category,created_at);
