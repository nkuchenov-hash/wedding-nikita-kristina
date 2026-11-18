# Wedding backend — private database and future guest portal

**Status (2026-11-16):** Private organiser admin LIVE at
`https://nikitakristina.ru/admin/`, protected with server-side form
authentication over trusted HTTPS. Guest invitation main site is still a
maintenance placeholder; the guest-facing API remains intentionally disabled.

Verified current private SQLite records (server logs):
- **114 people** from the original Wedding Drive sheet, with 114 full source
  profiles, draft English variants and **71 relationships**; 8 invitation
  decisions flagged for review. **No invites sent and no RSVP accepted.**
- **25 venue records**, **330 venue photographs** indexed with original Drive
  IDs and room-category labels (linked Drive thumbnails, not binary copies).
- **51 Drive source references** — 41 documents/estimates, 7 videos, 3
  overarching archive folders, imported via a server-decrypted encrypted
  inventory file with no readable Drive IDs in the public Git repository.
- **12 planning tasks**, **2 schedule events**; no invented payments or
  approved menu. Unrequested supplier prototype rows were deleted (0 remain).

Source files are served through a password-protected admin-only route.
The originals remain in Google Drive; image/document bytes are not copied
to REG.RU. Database, backups and encryption keys remain off webroot.

## Architecture

- **REG.RU shared hosting:** PHP 8.2 + SQLite + GD, no long-running daemon needed.
- **Data:** `wedding.sqlite3` outside document root. SQLite is in WAL mode. Tables and
  foreign keys are declared in `schema.sql`.
- **Private photos:** `wedding-private/uploads`; JPEG images are re-encoded server-side
  to strip EXIF, including GPS metadata. Moderation defaults to `pending`.
- **Sessions:** private `wedding-private/sessions`; HttpOnly, Secure and SameSite=Lax.
- **Secrets:** `wedding-private/wedding-config.json` (0600), random server-side
  invite hashing pepper, and password hashes stored in database. Never commit either.
- **Migrations and seeds:** `bin/migrate.php`, `bin/backfill-guest-profiles.php`, `bin/seed-venues.php`, `bin/import-venue-files.php`, `bin/import-guests.php`, `bin/smoke.php`.
  Existing venue edits are never overwritten by the seed process.
- **Automated deploy:** `.github/workflows/backend.yml` copies backend source only
  to the private directory, backs up the DB before reapplying idempotent migrations,
  tests SQLite constraints, and verifies backend remains disabled.
- **Source of truth for guests:** the protected SQLite database. The original five-tab import is retained only in a separate private Wedding Drive archive. The one-tab Google Sheets document is a dated backup/reference, **not a second editable live database**; the admin CSV export produces current data on demand.

## Access rules (already implemented in the API)

- Live organizer access uses a bcrypt `.htpasswd` credential verified by PHP at `/admin/index.php` with an HttpOnly Secure session. The future API also supports separate admins.
- Guests enter using high-entropy invitation tokens. Only HMAC-SHA-256 hashes of
  tokens are stored. Tokens can be expired or revoked.
- Guests can edit their own profile, RSVP, menu choices and accompanying people's
  details. Cross-guest writes are not exposed.
- Other guests' profile cards are visible only with explicit profile consent and
  only when the organizer has enabled the directory.
- Contact details, dietary restrictions, private notes and transport preferences
  are not included in the guest directory API.
- Stories and photographs require moderator approval; no automatic publication.
- Guest RSVP, menu choices, directory, photo uploads and stories default to **closed**
  until organizers explicitly enable them.
- All state-changing authenticated endpoints require CSRF and same-origin checks.
- Login and upload endpoints have rate limits, and input fields have size/type checks.
- API accepts private operations only over HTTPS **and** when enabled in private config.

## Live organiser routes and future guest routes

Live organizer data are available ONLY after login via
`/admin/index.php?api=<route>` and the same server-side session as the admin
HTML/JS/CSS. The guest-facing `/api/index.php?r=<route>` is not published.

### Implemented API routes (public guest API remains disabled)

Routes use `/api/index.php?r=<route>`. Deploy `public/index.php` ONLY once
the PHP handler works, the Let's Encrypt certificate validates, an admin
account has been safely provisioned, and authorization tests pass.

| Actor | Route | Method | Purpose |
|---|---|---|---|
| Public | health | GET | Reports disabled/configured state without private data |
| Admin | auth/admin | POST | Authenticate with login and password |
| Invited guest | auth/invite | POST | Authenticate using invitation token |
| Signed-in user | auth/session, auth/logout | GET, POST | Role, CSRF, log out |
| Admin | admin/overview, admin/guests | GET | Planning overview and 114 imported guests |
| Admin | admin/guests, admin/guest/update | POST | Create/update organizer-only guest records |
| Admin | admin/invitations | POST | Generate single-guest invitation token |
| Admin | admin/import/guests | POST multipart | Import vetted CSV, no overwrite |
| Admin | admin/records | GET/POST/PATCH | Structured venues, budgets, tasks, menu and timeline |
| Internal | admin/settings | GET/POST | Future guest feature gates; not exposed in admin navigation |
| Admin | admin/moderation, admin/review | GET, POST | Approve/reject stories/photos |
| Admin | admin/venue-files | GET | All 51 source document/video/archive references |
| Admin | admin/guest-profile | GET | Complete original profile and relationships |
| Admin | admin/guest-profile/update | PATCH | Update English name and seating group |
| Guest | guest/me, guest/event | GET | Own profile and confirmed event data |
| Guest | guest/profile | PATCH | Personal card and optional visibility consent |
| Guest | guest/companions | GET/POST | People attending with the invitee |
| Guest | guest/rsvp | POST | Attendance, guest counts and private dietary notes |
| Guest | guest/menu, guest/menu-choice | GET/POST | Menu selections |
| Guest | guest/photos, guest/story | POST | Private uploads, stories awaiting review |
| Guest | guest/directory | GET | Consented profiles only |
| Guest/admin | media/photo | GET | Server-authorized access to private images |

## Excel guest list — no data in GitHub

For a local XLSX workbook:

```bash
python -m pip install openpyxl
python tools/prepare-guest-import.py "guests.xlsx" --out "private-wedding-data/guests.csv"
```

The tool writes a CSV and `guests.audit.json`, preserving side, children,
plus-ones and uncertainties. Review possible couples/group entries, unknown
child counts, and duplicate candidates before submitting the CSV into the
admin tool. **Import does not constitute sending invitations or confirming RSVP.**

## Remaining work before guest invitations

1. Obtain the organizers' approval of the guest-facing site design before
   publishing anything on the main domain.
2. Complete testing of guest invitation login, isolation, consent, RSVP,
   menu choices, media moderation, storage quotas and Russian privacy rules.
3. Implement a tested independent encrypted off-site backup and restore
   strategy. Current daily SQLite backups are kept on the same hosting account.
4. Reconcile unapproved menu, undetermined vendor quotes and actual payments
   as they arrive. Do not make up these values.
5. Review Google Drive's own sharing permissions for guest-list materials:
   securing the website does not change external Drive sharing.
6. For a fully self-contained archive, copy original document and photo bytes
   into protected storage and verify capacity/quotas before migration. Current
   admin indexes and previews all sourced files but retains originals in Drive.

No PocketBase daemon or a second MySQL database is needed for the current
shared-hosting architecture. Guest publishing remains disabled until approved.

## Unified guest workspace (18 Nov 2026)

- One private organiser page at `/admin/#/admin/guests` for the entire guest list. It reads and writes the same SQLite `guests`, `guest_profile_details`, `guest_relationships`, `guest_companions`, `guest_progress`, `invitations` and `rsvps` tables.
- No secondary guest spreadsheet widget or duplicate edit table is rendered. Names, side, decision, family context, seating and RSVP can be edited from the directory; the single guest card handles all other editable fields.
- Private notes, community, Russian and English bio are stored as editable database fields. Idempotent, one-time backfill takes them from private original source snapshots only if the destination is empty and never invents missing names.
- Relation editing uses permanent guest IDs; removing a link does not delete either person. Companion records are managed separately from individual guests. Guest exclusions are reversible archives, not destructive deletes.
- The organiser CSV export contains current database data. The Wedding Drive Google Sheet contains **exactly one tab `Гости`** as a historical snapshot, while the full 13-tab source workbook is preserved in the separate archive. Google Sheets edits do **not** automatically update SQLite; do not present spreadsheet RSVP or invitation statuses as live.
- Publishing actual guests to the public website remains subject to explicit visibility consent. Preparing a token never means an invitation was sent.
