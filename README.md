# Foreman

An AI agent dashboard for a home-services business, modeled on a roofing company.
This is a **demo**: the agents, leads, invoices and ads are all made up, and a timer
drives the activity. Nothing is connected to a real system yet.

## What's in it

- **War room**: an isometric office where each agent sits at a desk, with a live
  scoreboard and speech bubbles as they work. Click an agent to see what it does,
  what it reads, and to pause it.
- **Chief of Staff rail**: decisions waiting on you (Approve / Hold) and a live
  feed of what every agent just did. Approving a decision changes the rest of the
  app (ad sets pause, invoices get reminded, a campaign starts).
- **Pipeline revival**: dormant-to-signed funnel, campaigns, sample text threads.
- **Branches**: per-location numbers and a speed-to-lead heatmap.
- **The Brain**: the shared memory, and which agent reads which part of it.
- **Sales, Branch ops, Marketing, Finance**: department pages with their agents.

## Run it

```sh
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/
npm run build:artifact # one self-contained HTML file in dist-artifact/
```

## Where things live

- `src/data/company.ts`: company name, owner, branches. Change these to re-skin it.
- `src/data/agents.ts`: the agents, their desks, and the Brain's memory shelves.
- `src/data/seed.ts`: demo records for the department pages.
- `src/state/store.tsx`: the simulation (events, approvals and their effects).
- `src/components/Office.tsx`: the isometric office, drawn in SVG.

## Making it real

The demo state in `store.tsx` is the seam. To go live, each agent becomes a job
that reads from the real systems (CRM, phone/SMS, calendars, Meta and Google
Ads, invoicing), writes its actions to a database, and posts anything risky
into the approvals table instead of acting on its own.
