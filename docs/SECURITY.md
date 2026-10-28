# Security and implementation status

## Current status
The repository contains a **public visual prototype**. `/admin` is **not protected**; it contains no genuine wedding personal or financial data, no upload, and no edit operations. Do not confuse a hidden link with authorization.

## Required before production
1. Create a Supabase project and run the reviewed SQL schema; verify RLS via tests for `anon`, uninvited `authenticated`, invited guest, and approved admin.
2. Configure admins with verified identities; never expose a service-role key in frontend, Github Pages, or workflow logs.
3. Implement Edge Functions to validate high-entropy invitation tokens server-side (only store token hashes), scope each guest's edits and RSVP, and limit repeated attempts. Alternatively, email OTP with server-side role checks.
4. Build read APIs that filter `profile_visible_to_guests` and exclude all private fields, including contact info, dietary restrictions and plus-one notes. Require invite authentication for any invited-only guest directory.
5. Provide guest photo upload using time-limited signed uploads scoped to the guest, validate type, size and rate limit server side; strip GPS EXIF, scan/transform images, moderate before public listing, issue short-lived signed read URLs for authorized viewers.
6. Host real backend secrets in Supabase / GitHub Actions secrets, not committed code. Enable backups, test restore and deletion requests, document privacy retention.
7. Separate public publishable schedule from admin-only event details. Check every query with least privilege.

## Notes about the migration
`supabase/migrations/001_initial.sql` is the *initial database design*, not evidence that a live database exists. It defaults all tables to admin-only. Guest read/upload endpoints and fine-grained review workflows are intentionally not yet implemented. Admin bootstrap is a manual administrative action after auth creation.

## Deployment
GitHub Pages only hosts the presentation layer; Pages cannot enforce private data access. Do not publish real attendee lists in `src/data.js`, Git history, static JSON, or HTML.