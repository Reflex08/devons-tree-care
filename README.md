# Devon's Tree Care — CRM

Single-file CRM for a tree service. No build step, no dependencies, no server:
`index.html` is the whole app, and it keeps working offline once the page has loaded.

Built from the Banana Detailing CRM and re-fitted for tree work: trimming, removal and
stump jobs, a monthly goal counted in jobs rather than dollars, and a deliberately short
job sheet — client, services, date, time, notes, and nothing else.

**Not published yet.** Open `index.html` directly, or host the folder anywhere static.

## What it does

Rolling 7-day schedule · clients · multi-service jobs (trim + grind + haul-away on one
visit) · dashboard against a 15-job month · one-tap confirmation link with tree-care terms
· CSV export and local backups.

The job sheet is five fields on purpose. Anything added back to it has to earn its place,
and a test fails if the trees field comes back.

## Services it ships with

Trimming (small / large), crown reduction, deadwooding, removal (small / medium / large),
stump grinding, full stump removal, hedge trimming, storm call-out, brush haul-away.

Every price is a starting figure and every one is editable in **Settings → Services**.
Tree work is priced on the tree in front of you, not off a list.

## Where the data lives

Everything is in the browser's `localStorage` under the `devon.*` keys. Nothing is sent
anywhere by default.

> **Clearing browser data erases the CRM.** Settings → Data → **Backup now** writes a full
> copy to one file. Use it.

Chrome shares one `localStorage` store across every `file://` page, so that `devon.`
prefix is the only thing keeping these records apart from any other CRM opened the same
way on the same machine. Don't change it.

Optional PC ⇄ phone sync keeps the database in a single private GitHub Gist
(`devon-db.json`). It needs a personal access token with only the `gist` scope, created on
the account that owns the data and pasted into Settings on each device. Sync is
last-write-wins across the whole database — it does not merge record by record, so avoid
editing the same day on two devices while one of them is offline.

> A `gist`-scoped token can read and write **every** gist on that account. Devon needs a
> token made on his own account, never a copy of somebody else's.

## Before Devon uses it for real

1. **Confirmation email.** Settings → Business → Confirmation email. Blank by default, and
   while it is blank the confirmation page has nowhere to send the record.
2. **Phone number.** Settings → Business. Only fills the call-back link on the confirmation
   page; the link itself is texted from Devon's own phone either way.
3. **Hosting, if the confirmation link is wanted.** The client opens `confirm.html` on
   their own phone, so it needs a public address. Put the folder on any static host, then
   set `CONFIRM_BASE` near the bottom of `index.html` to the hosted `confirm.html`. Until
   then the Confirm button says so instead of texting a dead link.
4. **Remove the sample data** once his real jobs are in — Settings → Data.

## Sample data

Ships with five fake clients and two weeks of jobs so the schedule isn't empty on first
open. Settings → Data → **Remove sample data** deletes exactly those and nothing added
since.

## The monthly goal

`const GOAL=15;` near the top of the script — completed **jobs** per month, not revenue.
Devon runs about fifteen clients a month, and a $120 haul-away and an $1,800 removal are
both one day's booking, so a job count tracks a busy month better than a dollar total.

## Tests

```
node tests/run-tests.js
```

83 checks over the service catalogue, seeding, the confirmation payload, multi-service
totals, settings backfill, the storage namespace, and the fields that are meant to stay
gone. No framework. Run it before shipping any edit.

## The confirmation relay (optional, not deployed)

`relay/` holds a Cloudflare Worker that would let a client's confirmation tick its way back
into the app automatically. It has never been deployed: `RELAY` still contains `REPLACE`,
and while it does, the app simply skips the poll.

Its `READ_KEY` is Devon's own. Never point this at another business's worker — the two
CRMs number their jobs from 1, so a shared relay would cross-confirm their appointments.
