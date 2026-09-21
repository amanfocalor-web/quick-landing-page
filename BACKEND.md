# Knot backend architecture

Knot uses Supabase/PostgreSQL as the backend foundation. The application does not depend on a local SQLite database.

## Source of truth

- Authentication: Supabase Auth
- Relational data: PostgreSQL
- Profile media: Supabase Storage
- Realtime-ready chat tables: PostgreSQL/Realtime integration point
- Authorization: PostgreSQL Row Level Security
- Sensitive state transitions: PostgreSQL functions
- Administrative access: `admin_roles` + server-enforced RLS/function checks
- Auditability: `audit_logs`

## Core relationship model

User/profile -> discovery preferences -> Pass/Interested/Cupid -> mutual match -> Trial Chat -> mutual Go Exclusive -> Couple -> double-date connections

Breakup requests enter a 24-hour cooling-off state before a couple is ended.

## Security model

The frontend is not trusted for authorization. RLS protects rows, and sensitive actions use server-side PostgreSQL functions that validate `auth.uid()`.

One-sided Secret Crush data is only selectable by its sender or authorized moderation logic; the recipient does not receive the crush through ordinary profile queries.

Creator permissions are represented by `admin_roles`. Founder/admin actions are intended to write audit events.

## Current boundary

The verification provider is deliberately outside this backend migration. DigiLocker credentials and raw identity documents should never be collected directly by Knot.
