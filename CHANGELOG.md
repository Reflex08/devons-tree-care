# Devon's Tree Care CRM — changelog

## 2026-10-19 — built

Forked from the Banana Detailing CRM and re-fitted for a tree service. Everything the
detailing app does, it still does; this lists only what changed.

### Trade fit

- **Services replaced.** Twelve tree-care services with starting prices: trimming (small
  and large), crown reduction / shaping, deadwooding, removal (small, medium, large),
  stump grinding, full stump removal, hedge trimming, storm / emergency call-out, brush
  and debris haul-away. All editable in Settings.
- **Vehicle field dropped, not replaced.** It briefly became "Trees on site" with a
  180-name species picker. Devon wants fewer boxes, so the field, the picker and the
  species data all came out again: the job sheet is client, services, date, time, notes.
  Anything that goes back on it has to earn its place, and four tests fail if the field
  returns.
- **Contract rewritten.** Sixteen clauses for tree work in place of the detailing terms:
  scope, access and site prep, buried services and power lines, lawn ruts and surface
  marking, debris and wood disposal, stump grinding depth and regrowth, hidden decay and
  embedded metal, permits and protected trees, pruning standards and tree health, weather
  and safety, liability, cancellation, running late, payment, photographs.
- **Goal counts jobs, not dollars.** The dashboard tracks 15 completed jobs a month rather
  than a revenue target. Tree work swings from a $120 haul-away to an $1,800 removal, so a
  dollar figure says little about whether the month was busy. The Goal chart, its axis,
  its tooltip and the hero line all read in jobs.

### Branding

- New mark: layered canopy over a flared trunk, drawn to a PNG at four times size and
  downsampled. Two colourways — dark wordmark for the light confirmation page, light one
  for the app's near-black drawer — plus 180/192/512 icons.
- Accent colour moved from banana yellow to leaf green across the app; the confirmation
  page moved from cream-and-butter to cream-and-green, and its palette tokens were renamed
  (`--butter` → `--moss`, `--cocoa` → `--bark`) so they still say what they are.

### Safety

- **Storage namespace is `devon.*`.** Chrome shares one `localStorage` store across every
  `file://` page, so this prefix is the only thing keeping these records apart from the
  other CRMs on the same machine. Backup filenames, the UI prefs key, the IndexedDB handle
  store and the sync gist all moved with it. A test asserts no `banana.` key survives.
- **Its own relay key.** `RELAY_KEY` and the worker's `READ_KEY` are new values, and the
  worker is named `devon-confirm-relay`. Sharing the detailing relay would cross-confirm
  appointments, because both CRMs number their jobs from 1.
- **No invented contact details.** `notify` ships empty rather than carrying another
  business's address, and the backfill no longer has a default to apply.

### Ease of use

- Number fields lost their spinner arrows. A 12px up/down target beside a figure you can
  simply type is a misclick, and on a phone it is a thumb-sized hazard next to the price.
- The running total has room under it before the date, so the sheet reads in blocks.

### Confirmation link

- `confirmPayload()` split out of `confirmLink()`, so the packed appointment can be read
  back and tested even with nowhere to host the page.
- `CONFIRM_BASE` is empty, because the client opens `confirm.html` on their own phone and
  there is no public address yet. The Confirm button says so instead of texting a dead
  link. Host the folder, set the constant, done.

### Not carried over

- The Cloudflare relay is still undeployed (`RELAY` contains `REPLACE`), so the app skips
  the confirmation poll.
- No phone number and no confirmation email — both are Devon's to enter in Settings.

### Tests

`node tests/run-tests.js` — 72 checks, all passing. The suite was re-pointed at the tree
catalogue, the jobs goal, the split confirm payload and the new namespace, and it now
guards the short job sheet: the trees field, its picker and the spinner CSS each have a
check that fails if they come back.
