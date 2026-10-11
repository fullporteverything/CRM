# Foreman

One CRM for every business you run. Each business gets a dashboard, a pipeline,
contacts, activities, reports and a war room where its agents sit at their desks.
Switch businesses from the menu next to the logo.

## Businesses and connectors

| Connector | What it shows | Where the data lives |
| --- | --- | --- |
| **Shoebox** (live) | Real Shoebox accounts, Tax Year Pass sales, reviews waiting for approval, devices, lockouts | Shoebox's Supabase database, read through admin-only functions |
| **Blank CRM** | Contacts, deals and notes you add yourself | This browser (localStorage) |
| **Sample business** | Kestrel Roofing, a made-up roofing company with a live agent simulation | This browser |

### Shoebox

Sign in with a Shoebox account that is listed in `shoebox.admins`. It's the same
sign-in as the app: the password never leaves the browser (only a proof derived
from it, as in Shoebox's `crypto.deriveSecrets`), lockouts apply, and a two-factor
code is asked for when it's on. Wrong codes count toward that account's wipe limit,
just like in the app.

What an admin sees is account metadata the server already keeps: email, join date,
founding number, devices, lockout counters, how many receipts/income/trip records
(never their contents, which are encrypted with keys the server doesn't have),
passes, reviews and savings figures. Admins can approve or reject reviews and keep
internal notes and tasks on an account.

The database side is `supabase/migrations/20261012000000_admin_crm.sql` in the
Shoebox repo. To make someone an admin:

```sql
insert into shoebox.admins (user_id) select user_id from shoebox.accounts where email = 'someone@example.com';
```

The pipeline for Shoebox is computed, not dragged: each account's pass for the
current tax year sits in a stage by how much they use Shoebox (signed up → adding
receipts → engaged → power user → pass bought). The stage odds are estimates.

The war-room desks for Shoebox are live monitors over that data (sign-ups,
onboarding, retention, security, reviews, billing). They flag and suggest; they
don't message anyone or change accounts.

### Adding a connector

1. Write `src/biz/<name>.ts` that returns a `Dataset` (`src/biz/types.ts`) and,
   optionally, `Actions` for what the business can change.
2. Add it to the `Connector` type, to `load` and `actionsFor` in `src/state/app.tsx`,
   and to the choices in `src/components/Settings.tsx`.

`src/biz/derive.ts` turns any `Dataset` into the dashboard, pipeline and report
numbers, so a connector only has to describe its records.

## Run it

```sh
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run build:artifact # one self-contained HTML file in dist-artifact/ (sample business only)
```

## Where things live

- `src/state/app.tsx`: businesses, the open page, loading and refreshing (live connectors every 30 s).
- `src/state/store.tsx`: the sample business's agent simulation (events, approvals and their effects).
- `src/biz/`: the data model, connectors and derived numbers.
- `src/pages/`: Dashboard, Pipeline, Contacts, Activities, Reports, War room.
- `src/components/Office.tsx`: the isometric office, drawn in SVG.
