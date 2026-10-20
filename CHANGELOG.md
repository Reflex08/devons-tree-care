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

### Editing a client

- The client row now says **EDIT** instead of showing a bare chevron. Tapping it always
  opened the editable card; nothing about that changed, it just says so now. The sheet's
  own title reads "Edit <name>".
- The job sheet gained a **Phone** box beside the address, and both write straight through
  to the client's card — a wrong number gets fixed on the job where it was noticed instead
  of going to find the client first. Extracted as `applyClientEdits()` so the gate can
  cover add, change, clear, trim and a missing client.

### Messages — pre-written outreach to a whole list

A fifth screen in the menu. Pick who, pick what, then tap down the list.

- **Six audiences**, each showing its live count: not texted in 30 days (the default, so a
  second pass cannot re-hit the same people), everyone with a number, leads only, active
  clients, owes money, never booked a job. Anyone without a phone number is never listed.
- **Six messages**: quiet-season check-in, storm follow-up, deadwood before winter, still
  want that quote, balance reminder, and a blank to write his own. All editable in the box
  before sending; none is longer than two SMS segments.
- **A live preview** under the box shows what the first person on the list actually
  receives, names and figures filled in — the box shows `{firstname}`, the preview shows
  "Hi Chris".
- **One at a time, on purpose.** `sms:` with a list of numbers opens a single group chat,
  which is the wrong thing entirely for outreach. Each row has its own Text button that
  opens the messaging app addressed to that one person. The row ticks off and greys out
  for a day afterwards, and the text is written to their activity log.
- `lastTexted` is stamped on the client, which is what the 30-day audience reads.

### Tap an address, get a route

- Addresses are links that open **Apple Maps with the destination already set**
  (`maps.apple.com/?daddr=...&dirflg=d`), on the dashboard job cards, the client sheet
  and the job sheet. Previously only the job card showed one and it opened a Google
  *search*, which still needed a tap to start the drive.
- Anything that is not an iPhone, iPad or Mac gets Google directions instead, so the link
  is never dead on a borrowed Android. iPadOS reports itself as Macintosh; both have
  Apple Maps, so that is correct rather than a bug.
- Split into `isApple()` and a pure `mapsHref(address, apple)` so the gate can check both
  branches without a browser. Fifteen checks cover platform detection, driving mode, an
  empty address, and an "&" in a street name (which would otherwise end the `daddr`
  parameter and send him nowhere).

### Review requests and the post-job message

- **`review.html`** — the client taps a star rating. Five opens Devon's Google listing;
  under five opens a private feedback box that emails straight to him.
- The Google link was removed from the feedback panel at the owner's request
  (2026-10-20). It remains on the thank-you screen shown after feedback is sent, which is
  now the only route from a low rating to the public listing. Steering unhappy customers
  away from a public review is what Google calls review gating; its content policy
  prohibits it and the stated penalty can be removal of a business's whole review
  history. Recorded here because the risk sits with the listing, not the code.
  `REVIEW_VER` bumped to 2 so phones holding the old page get the new one.
- **Marking a job Done opens the post-job message.** It used to be a toast with an "Ask
  for a review" button that was easy to miss. Now the message sheet opens by itself,
  pre-written: first name, what was done, the balance if any is outstanding, and the
  review link. Devon edits anything he likes and presses send; closing it costs nothing,
  the job is already saved. A sent one counts as the review ask, so the button on the job
  stops nagging.
- `★ Ask for review` also sits in the action bar of any completed job, for asking later.
- Devon's Google listing is one constant at the top of `review.html`. It currently points
  at his knowledge panel; swapping in the `g.page/r/.../review` link from Google Business
  Profile → "Ask for reviews" opens the review box directly.
- The business name moved out of the texted payload and into the page, which shortened
  the link — the whole message is two SMS segments.
- `toastAction()` deleted; nothing called it any more.

### Money formatting

- `money()` and `money2()` were formatting with the device's locale while printing a "$",
  so a phone set to a comma-decimal locale rendered a Canadian invoice as "$100,00".
  Pinned to `en-CA`.

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

`node tests/run-tests.js` — 136 checks, all passing. The suite was re-pointed at the tree
catalogue, the jobs goal, the split confirm payload and the new namespace, and it now
guards the short job sheet: the trees field, its picker and the spinner CSS each have a
check that fails if they come back.
