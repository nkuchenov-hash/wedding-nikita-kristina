# Wedding backend — private database and future guest portal

**Status (2026-11-15):** Code deployed on REG.RU shared hosting into
`/var/www/u3728035/data/wedding-private/backend`; SQLite database created outside
`www/`, schema validated, 25 venue records seeded. The runtime config
`wedding-config.json` deliberately has `enabled: false` and public API routes are
NOT installed. Do not accept personal data until trusted HTTPS and
administrative/guest authorization are externally verified.

## Architecture

- **REG.RU shared hosting:** PHP 8.2 + SQLite + GD, no long-running daemon needed.
- **Data:** `wedding.sqlite3` outside document root. SQLite is in WAL mode. Tables and
  foreign keys are declared in `schema.sql`.
- **Private photos:** `wedding-private/uploads`; JPEG images are re-encoded server-side
  to strip EXIF, including GPS metadata. Moderation defaults to `pending`.
- **Sessions:** private `wedding-private/sessions`; HttpOnly, Secure and SameSite=Lax.
- **Secrets:** `wedding-private/wedding-config.json` (0600), random server-side
  invite hashing pepper, and password hashes stored in database. Never commit either.
- **Migrations and seeds:** `bin/migrate.php`, `bin/seed-venues.php`, `bin/smoke.php`.
  Existing venue edits are never overwritten by the seed process.
- **Automated deploy:** `.github/workflows/backend.yml` copies backend source only
  to the private directory, backs up the DB before reapplying idempotent migrations,
  tests SQLite constraints, and verifies backend remains disabled.
- **Source of guests:** a later Excel file; none is currently imported.

## Access rules (already implemented in the API)

- Admins have bcrypt password hashes and private server sessions.
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

## Supported paths (not exposed on the live domain yet)

Routes use `/api/index.php?r=<route>`. Deploy `public/index.php` ONLY once
the PHP handler works, the Let's Encrypt certificate validates, an admin
account has been safely provisioned, and authorization tests pass.

| Actor | Route | Method | Purpose |
|---|---|---|---|
| Public | health | GET | Reports disabled/configured state without private data |
| Admin | auth/admin | POST | Authenticate with login and password |
| Invited guest | auth/invite | POST | Authenticate using invitation token |
| Signed-in user | auth/session, auth/logout | GET, POST | Role, CSRF, log out |
| Admin | admin/overview, admin/guests | GET | Planning overview and full guest list |
| Admin | admin/guests, admin/guest/update | POST | Create/update invited guests |
| Admin | admin/invitations | POST | Generate single-guest invitation token |
| Admin | admin/import/guests | POST multipart | Import vetted CSV, no overwrite |
| Admin | admin/records | GET/POST/PATCH | Structured venues, vendors, budgets, tasks, menu and timeline |
| Admin | admin/settings | GET/POST | Event details and feature release gates |
| Admin | admin/moderation, admin/review | GET, POST | Approve/reject stories/photos |
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

## Additional production steps required

1. Validate the domain's DNS and trusted Let's Encrypt certificate (including www).
2. Confirm `/admin/index.php` is actually executed by PHP (not served as a file
   or masked by a registrar redirect). Verify unauthenticated requests are rejected.
3. Create an admin through **interactive** server CLI `php bin/create-admin.php username`;
   never print a password in CI logs or store it in Git.
4. Add a safe PHP API entrypoint under `/api/index.php` only after positive
   handling tests. Enable `wedding-config.json` only after external TLS checks.
5. Test role isolation, CSRF, private photos, guest invitation expiry and rate limits
   against the real public domain and real networks from Russia and abroad.
6. Test full backup restore. Current automatic SQLite snapshots are on the **same**
   hosting account, not an offsite backup. Arrange encrypted independent backups in
   an appropriate Russian location before collecting personal data.
7. Publish a clear privacy policy, retention schedule, withdrawal/deletion process,
   and verify consents appropriate to the guests' countries and data processing.
8. Approve the guest-site design separately. Do **not** publish the invitation
   just because backend and admin features are ready.

**No additional VPS or PocketBase installation is required for the current shared
hosting.** PocketBase is a possible later migration option when a VPS with a
persistent process is available.
