# Working on Foreman (the CRM)

## Always deploy
The owner wants every change deployed by Claude, every time, without being asked
and no matter which chat or channel the request came from. Finished work isn't
done until it's live and checked:

1. Run `npx tsc --noEmit` and `npm run build`.
2. Push to the default branch (`claude/agent-dashboard-demo`). The repo is meant
   to be connected to Vercel, which deploys each push. If no Vercel project
   exists for it yet, create one (team `acenv1`) from this repo with the
   default Vite settings.
3. If the change needs Shoebox database changes, they live in the Shoebox repo
   (`supabase/migrations/`) and are applied to Supabase project
   `ovxykjbnpozndcgxkqwg`.
4. Confirm the deployment is live, then give the owner the link.

If Vercel access fails, say so plainly with what's blocked and what the owner
needs to reconnect. Never leave work undeployed without telling them.

## Things to keep in mind
- Each business plugs in through a connector in `src/biz/` (see README).
  Shoebox is live data; Kestrel Roofing is sample data; keep the war room.
- The Shoebox connector only ever sees account metadata, never record contents.
- Commit messages must not name an AI model.
