/* Devon's Tree Care CRM — test gate.
 *
 *   node tests/run-tests.js            (from the repo root)
 *
 * The app is one HTML file whose script expects a browser, so the gate pulls the script
 * out, stubs the handful of globals it touches at load time, and then exercises the real
 * functions. No framework, no dependencies — same house style as the Flyra gate.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

let pass = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fails.push(name + (detail ? "  — " + detail : ""));
}
function eq(name, got, want) {
  ok(name, JSON.stringify(got) === JSON.stringify(want),
     "got " + JSON.stringify(got) + ", wanted " + JSON.stringify(want));
}

/* ---------- load the app ---------- */
const script = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));

/* Top-level `const`/`let` never become properties of a vm global the way `function` and
   `var` do, and the module's own `db` binding is likewise unreachable from outside. This
   snippet runs in the same scope and hands both out. */
const shim = script + `
;globalThis.__k = {DEFAULT_SERVICES,DEFAULT_SETTINGS,GOAL,KEY,OLDKEY,RELAY,CONFIRM_BASE};
;globalThis.__setDb = v => { db = v; };
;globalThis.__setSvc = v => { jobSvc = v; };
;globalThis.__getDb = () => db;
`;

// Minimal DOM: every lookup returns an inert node, so render paths run without throwing.
const node = new Proxy({}, {
  get(t, k) {
    if (k === "style" || k === "dataset" || k === "classList") return node;
    if (k === "value" || k === "textContent" || k === "innerHTML") return "";
    if (k === "files") return [];
    if (Symbol.toPrimitive === k || k === "toString") return () => "";
    return typeof k === "string" ? () => node : undefined;
  },
  set() { return true; },
});
const store = new Map();
const sandbox = {
  console,
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  },
  document: {
    querySelector: () => node,
    querySelectorAll: () => [],
    getElementById: () => node,
    addEventListener() {},
    createElement: () => node,
    documentElement: node,
    body: node,
    hidden: false,
  },
  navigator: { standalone: false },
  indexedDB: null,
  fetch: () => Promise.reject(new Error("no network in the gate")),
  setTimeout: () => 0,
  setInterval: () => 0,
  clearTimeout() {},
  btoa: s => Buffer.from(s, "binary").toString("base64"),
  atob: s => Buffer.from(s, "base64").toString("binary"),
  location: { href: "", search: "" },
  URL,
  Blob: function () {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
  devicePixelRatio: 1,
  confirm: () => true,
  alert() {},
  prompt: () => "",
  crypto: { getRandomValues: a => a },
};
sandbox.window = sandbox;
sandbox.self = sandbox;
try {
  vm.createContext(sandbox);
  vm.runInContext(shim, sandbox, { timeout: 15000 });
} catch (e) {
  console.error("FATAL: the app script threw on load —", e.message);
  process.exit(1);
}
const A = sandbox;
const K = sandbox.__k;

/* ---------- dates ---------- */
eq("weekDates returns 7 consecutive days", A.weekDates("2026-10-18"),
   ["2026-10-18","2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24"]);
eq("weekDates rolls across a month end", A.weekDates("2026-10-29")[6], "2026-11-04");
eq("weekDates starts at the given day, not Sunday", A.weekDates("2026-10-21")[0], "2026-10-21");
eq("localISO is local, not UTC", A.localISO(new Date(2026, 0, 1, 23, 30)), "2026-01-01");

/* ---------- money ---------- */
eq("jobBalance ignores jobs that aren't done",
   A.jobBalance({ status: "scheduled", price: 250, collected: 0 }), 0);
eq("jobBalance is price minus collected once done",
   A.jobBalance({ status: "completed", price: 250, collected: 100 }), 150);
eq("jobBalance never goes negative",
   A.jobBalance({ status: "completed", price: 100, collected: 250 }), 0);
eq("payState partial", A.payState({ price: 250, collected: 100 }), "partial");
eq("payState paid", A.payState({ price: 250, collected: 250 }), "paid");

/* ---------- the tree-care service catalogue ---------- */
const svcNames = K.DEFAULT_SERVICES.map(s => s.name);
ok("services are tree work, not detailing or window cleaning",
   svcNames.includes("Stump Grinding") && svcNames.includes("Tree Removal (Large)") &&
   !svcNames.some(n => /window|gutter|wax|ceramic|interior/i.test(n)),
   svcNames.join(", "));
ok("trimming, removal and stumps are all covered",
   ["Trimming", "Removal", "Stump"].every(w => svcNames.some(n => n.includes(w))),
   svcNames.join(", "));
ok("every service has a price", K.DEFAULT_SERVICES.every(s => +s.price > 0));
// The goal counts jobs, not dollars: a $120 haul-away and a $1,800 removal are both one
// day's booking, so revenue says little about whether the month was busy.
eq("the monthly goal is 15 jobs", K.GOAL, 15);

/* ---------- seed + sample wipe ---------- */
const seeded = A.seed();
ok("seed ships sample customers", seeded.customers.length > 0);
ok("every seeded record is tagged sample",
   seeded.customers.every(c => c.sample) && seeded.jobs.every(j => j.sample));
ok("seed marks itself so a wipe is permanent", seeded.seeded === true);
ok("seeded jobs point at seeded customers",
   seeded.jobs.every(j => seeded.customers.some(c => c.id === j.customerId)));
ok("seeded clients carry an address", seeded.customers.every(c => /[A-Za-z]/.test(c.street)));

/* ---------- confirm link ---------- */
A.__setDb(A.normalize({
  customers: [{ id: 1, name: "Marcus Webb", phone: "+15550102", street: "41 Granger Ave", log: [] }],
  jobs: [{ id: 7, customerId: 1, service: "Tree Removal (Medium)",
           price: 900, date: "2026-10-22", time: "08:00", status: "scheduled" }],
  settings: { business: { name: "Devon's Tree Care", notify: "devon@example.com", cancelFeePct: 20 },
              services: K.DEFAULT_SERVICES },
  seqC: 2, seqJ: 8,
}));
const b64 = A.confirmPayload(7);
ok("the payload is built even with nowhere to host the page yet", !!b64, String(b64));
const payload = JSON.parse(Buffer.from(
  b64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
eq("payload carries the job id so the tick can come back", payload.j, [7]);
eq("payload carries the price", payload.p, 900);
eq("payload carries the notify address", payload.e, "devon@example.com");
eq("payload carries the cancellation fee", payload.f, 20);
ok("payload stays short enough for any SMS app", b64.length < 460, b64.length + " chars");
// confirm.html has to be reachable from the client's own phone, so it points at the
// published copy. Empty it and the Confirm button says so instead of texting a dead link.
ok("CONFIRM_BASE points at a published confirm page",
   /^https:\/\/\S+\/confirm\.html$/.test(K.CONFIRM_BASE), K.CONFIRM_BASE);
const link = A.confirmLink(7);
ok("a link is produced", !!link, String(link));
ok("the link is versioned, so a cached confirm page cannot be served to it",
   /confirm\.html\?v=\d+&d=/.test(link), link);
ok("the whole link still fits an SMS", link.length < 600, link.length + " chars");


/* ---------- multi-service jobs (upsells) ---------- */
A.__setSvc([]);
eq("an empty service list totals nothing", A.jobTotal(), 0);
A.__setSvc([{ name: "Tree Trimming (Small)", price: 250 }, { name: "Stump Grinding", price: 180 },
            { name: "Brush & Debris Haul-Away", price: 120 }]);
eq("the total is the sum of every row", A.jobTotal(), 550);
ok("each row renders its own price input",
   (A.svcLinesHTML().match(/data-svcp=/g) || []).length === 3);
ok("each row can be removed",
   (A.svcLinesHTML().match(/data-svcx=/g) || []).length === 3);
ok("the add control offers the services not already on the job",
   A.svcLinesHTML().includes("Deadwooding") && !/>Stump Grinding —/.test(A.svcLinesHTML()));
A.__setSvc([{ name: "Hedge Trimming", price: 150 }]);
eq("one row still totals correctly", A.jobTotal(), 150);

/* ---------- done / not done ---------- */
A.__setDb(A.normalize({
  customers: [{ id: 1, name: "Marcus Webb", phone: "+15550102", log: [] }],
  jobs: [{ id: 1, customerId: 1, service: "Hedge Trimming", price: 150, collected: 150,
           date: "2026-10-14", status: "completed", completedAt: 1, termsAcceptedAt: 1 }],
  settings: K.DEFAULT_SETTINGS(), seqC: 2, seqJ: 2,
}));
A.uncompleteJob(1);
const undone = A.__getDb().jobs[0];
eq("Not done puts the job back to booked", undone.status, "scheduled");
eq("Not done clears the collected amount", undone.collected, 0);
eq("Not done clears the completed stamp", undone.completedAt, 0);
ok("Not done leaves a trail of what was collected",
   A.__getDb().customers[0].log.some(l => /Done undone/.test(l.m) && /150/.test(l.m)));
ok("a booked card is blue, not green", A.weekCard(undone).indexOf("week-card done") < 0);
ok("a booked card keeps the confirmed tick", A.weekCard(undone).includes('class="ck"'));
A.__getDb().jobs[0].status = "completed";
ok("a done card is green", A.weekCard(A.__getDb().jobs[0]).includes("week-card done"));

/* ---------- settings backfill ----------
   A db saved before a field existed must gain it, or features keyed off it fail silently. */
const oldDb = A.normalize({ customers: [], jobs: [],
  settings: { business: { name: "Devon's Tree Care" }, services: K.DEFAULT_SERVICES },
  seqC: 1, seqJ: 1 });
eq("an older db gains the owner name", oldDb.settings.business.owner, "Devon");
eq("an older db gains the cancellation fee", oldDb.settings.business.cancelFeePct, 20);
// Devon's notify address is his to enter in Settings, so there is no default to backfill.
// Both readers use `notify || ""`, so an absent key is as good as an empty one.
ok("no confirmation address is invented", !oldDb.settings.business.notify,
   String(oldDb.settings.business.notify));
ok("a set confirmation email is never overwritten",
   A.normalize({ customers: [], jobs: [],
     settings: { business: { name: "X", notify: "someone@else.com" }, services: K.DEFAULT_SERVICES },
     seqC: 1, seqJ: 1 }).settings.business.notify === "someone@else.com");

/* ---------- cancellation fee ---------- */
eq("the fee defaults to 20%", K.DEFAULT_SETTINGS().business.cancelFeePct, 20);
eq("a stored 50% is moved to 20 once",
   A.normalize({ customers: [], jobs: [],
     settings: { business: { name: "X", cancelFeePct: 50 }, services: K.DEFAULT_SERVICES },
     seqC: 1, seqJ: 1 }).settings.business.cancelFeePct, 20);
eq("a fee the owner chose is left alone",
   A.normalize({ customers: [], jobs: [], feeTo20: true,
     settings: { business: { name: "X", cancelFeePct: 35 }, services: K.DEFAULT_SERVICES },
     seqC: 1, seqJ: 1 }).settings.business.cancelFeePct, 35);

/* ---------- the job sheet stays short ----------
   Devon wants as few boxes as possible, so the sheet is client, services, date, time,
   notes. Anything added back here has to earn its place. */
for (const token of ["jf-tree", "TREE_TYPES", "lastTree", "bindTreeSuggest"]) {
  ok("the trees field is gone: " + token, !script.includes(token));
}
ok("number fields have no spinner arrows",
   /input\[type=number\]\{[^}]*appearance:textfield/.test(html) &&
   html.includes("::-webkit-inner-spin-button"));

/* ---------- storage namespace ---------- */
// Chrome shares ONE localStorage store across every file:// page, so this prefix is the
// only thing keeping Devon's records apart from the other CRMs on the same machine.
ok("storage namespace is devon, never banana or servicepro",
   K.KEY.startsWith("devon.") && !script.includes("servicepro") && !script.includes("banana."),
   K.KEY);
ok("the relay key is Devon's own, never the detailing one",
   !script.includes("bn-39515b84e20e5a76"));
ok("no legacy key is adopted", K.OLDKEY === "");

/* ---------- things that should no longer exist ---------- */
for (const [name, token] of [
  ["the AI quick add is gone", "AI_KEY"],
  ["the Anthropic call is gone", "api.anthropic.com"],
  ["the quote sheet is gone", "openQuote"],
  ["the signature pad is gone", "signPad"],
  ["the commissions leaderboard is gone", "leaderboardPanel"],
  ["the baked contact import is gone", "CONTACTS_IMPORT"],
  ["the day timeline is gone", "renderDayTimeline"],
  ["the schedule view switcher is gone", "schedView"],
  ["the single price field is gone", "jf-price"],
  ["the half-typed job draft detour is gone", "restoreJobDraft"],
  ["text templates are gone", "DEFAULT_TEMPLATES"],
  ["the template picker is gone", "applySmsTpl"],
  ["quick add is gone", "quickParseLine"],
  ["the quick-add keyword map is gone", "QA_SERVICES"],
  ["the status dropdown is gone", "jf-status"],
  ["the pay method field is gone", "jf-paymethod"],
  ["the collected field is gone", "jf-collected"],
]) ok(name, !script.includes(token));
ok("no real phone numbers are baked into the app",
   !/\+1(?!555)\d{10}/.test(script));

/* ---------- report ---------- */
const total = pass + fails.length;
if (fails.length) {
  console.log("\n" + fails.length + " of " + total + " checks FAILED:\n");
  fails.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("\n✓ all " + total + " checks pass\n");
