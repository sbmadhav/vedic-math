/* Online leaderboards on Firebase (Google Cloud): Firestore, plus anonymous sign-in only for posting, and App Check when configured.
   Loaded lazily, only when a World board is opened, something is posted or a Player who posted is removed,
   so it never slows the first view. Each Player who posts has their own anonymous identity (appNameFor).
   Stores only a generated nickname, an avatar color, a score and two timestamps: no names, emails or ages.
   Two rules from docs/adr: nothing is posted for a Player without an Age answer, or under 13 without the
   Parent step (canPost, checked inside submit so no caller can skip it); and no identity exists until the
   first post (viewing a World board loads no Auth and never signs in). */
import { FIREBASE, appCheckSiteKey, appCheckProvider } from './cloud-config.js';
import * as store from './store.js';

const V = '10.12.2', CDN = `https://www.gstatic.com/firebasejs/${V}`;
/* Score caps and the entry lifetime, mirrored from cloud/firestore.rules (the rules are the authority):
   Arena boards per league, Ranked game boards (g_...) and weekly Sparks boards (xp-week-...) one cap each. */
export const MAX_SCORE = { explorer: 2000, challenger: 1600, pro: 1200 };
export const MAX_GAME_SCORE = 12000, MAX_WEEK_SPARKS = 60000;
export const KEEP_DAYS = 30;
export const enabled = () => !!(FIREBASE && FIREBASE.projectId);
export const appCheckOn = () => enabled() && !!appCheckSiteKey;

/* How the SDK files load. Tests swap it for stubs (see test/cloud.test.mjs). */
let load = url => import(url);
let read = null;
const writes = new Map(); /* app name -> Promise of that Player's { uid, db, fs } */
const apps = new Map();   /* app name -> Firebase app, for the named apps made in this page */
let cleared = null;       /* the one clearForgotten run of this page */
export function _setLoader(fn) { load = fn || (url => import(url)); read = null; cleared = null; writes.clear(); apps.clear(); }

/* One identity per Player (openspec board-identity). Each Player who posts gets their own Firebase app, so
   their own Auth session: Firebase saves it under a key holding the app name. The first Player (p1) keeps
   the default app, where the identity shared by every Player before this change lives; the others are
   'vm-<player id>'. Player ids are generated and the app name never leaves the device. */
export const appNameFor = p => (p.id === 'p1' ? '[DEFAULT]' : 'vm-' + p.id);

/* Each Player's anonymous id, kept here after their first post so a World board can mark "me" without
   loading Auth: { [player id]: uid }. Firebase already keeps the same id in this browser; nothing new leaves
   it. vm.cloudUid is the shared id from before Players had their own, and belongs to p1. */
const UIDS_KEY = 'vm.cloudUids', LEGACY_UID = 'vm.cloudUid', FORGET_KEY = 'vm.cloudForget';
const getJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
const putJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
export function savedUid(p) {
  if (!p) return null;
  const u = getJSON(UIDS_KEY, {})[p.id];
  if (u) return u;
  if (p.id !== 'p1') return null;
  try { return localStorage.getItem(LEGACY_UID); } catch (e) { return null; }
}
const saveUid = (p, uid) => { const m = getJSON(UIDS_KEY, {}); m[p.id] = uid; putJSON(UIDS_KEY, m); };

/* Reading: the default app, Firestore and App Check. No Auth: list queries need no sign-in. */
function bootRead() {
  if (!enabled()) return Promise.reject(new Error('off'));
  if (read) return read;
  read = (async () => {
    const [appMod, fs, ac] = await Promise.all([load(`${CDN}/firebase-app.js`), load(`${CDN}/firebase-firestore.js`),
      appCheckOn() ? load(`${CDN}/firebase-app-check.js`) : null]);
    const make = name => {
      const app = name === '[DEFAULT]' ? appMod.initializeApp(FIREBASE) : appMod.initializeApp(FIREBASE, name);
      if (ac) {
        /* On localhost App Check prints a debug token in the console; add it under App Check > Manage debug tokens. */
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        const Provider = appCheckProvider === 'v3' ? ac.ReCaptchaV3Provider : ac.ReCaptchaEnterpriseProvider;
        ac.initializeAppCheck(app, { provider: new Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
      }
      return app;
    };
    const app = make('[DEFAULT]');
    /* A named app for one Player, made once per page */
    const appFor = name => { if (name === '[DEFAULT]') return app; if (!apps.has(name)) apps.set(name, make(name)); return apps.get(name); };
    return { app, db: fs.getFirestore(app), fs, appMod, appFor };
  })();
  read.catch(() => { read = null; });
  return read;
}

/* Saved sessions of removed Players, signed out at the next post on this device (see forget). Also the
   default app's session once p1 is gone, so the shared identity is never reused by another Player. */
async function clearForgotten(base, auth) {
  const ids = getJSON(FORGET_KEY, []), noP1 = !store.allPlayers().some(p => p.id === 'p1');
  const names = ids.filter(id => id !== 'p1').map(id => 'vm-' + id);
  if (noP1) names.push('[DEFAULT]');
  for (const name of names) {
    try {
      const app = base.appFor(name), a = auth.getAuth(app);
      await a.authStateReady();
      if (a.currentUser) await auth.signOut(a);
      if (name !== '[DEFAULT]') { await base.appMod.deleteApp(app); apps.delete(name); }
    } catch (e) {}
  }
  if (ids.length) putJSON(FORGET_KEY, []);
}

/* Posting: adds Auth and this Player's anonymous sign-in. Only a permitted submit reaches this. */
function bootWrite(p) {
  const name = appNameFor(p);
  if (writes.has(name)) return writes.get(name);
  const w = (async () => {
    const [base, auth] = await Promise.all([bootRead(), load(`${CDN}/firebase-auth.js`)]);
    if (!cleared) { cleared = clearForgotten(base, auth); cleared.catch(() => {}); }
    await cleared;
    const app = base.appFor(name), a = auth.getAuth(app);
    await a.authStateReady(); /* wait for this Player's saved session, or every post would sign in as a new player */
    if (!a.currentUser) await auth.signInAnonymously(a);
    saveUid(p, a.currentUser.uid);
    return { uid: a.currentUser.uid, db: name === '[DEFAULT]' ? base.db : base.fs.getFirestore(app), fs: base.fs, a, auth, app };
  })();
  writes.set(name, w);
  w.catch(() => { if (writes.get(name) === w) writes.delete(name); });
  return w;
}

/* A Player was removed from this device: sign them out and forget their id here. Their entries already on
   World boards stay (removal on request). Only a Player who posted from this browser has anything to forget;
   for them the SDK loads (no sign-in) to drop the saved session now. If that fails (offline), the id is
   remembered and the next post on this device clears it (clearForgotten). */
export async function forget(p) {
  if (!p) return;
  const name = appNameFor(p), loaded = writes.get(name), had = !!savedUid(p) || !!loaded;
  const m = getJSON(UIDS_KEY, {}); delete m[p.id]; putJSON(UIDS_KEY, m);
  if (p.id === 'p1') { try { localStorage.removeItem(LEGACY_UID); } catch (e) {} }
  writes.delete(name);
  if (!had || !enabled()) return;
  try {
    const [base, auth] = await Promise.all([bootRead(), load(`${CDN}/firebase-auth.js`)]);
    const app = base.appFor(name), a = auth.getAuth(app);
    await a.authStateReady();
    if (a.currentUser) await auth.signOut(a);
    if (name !== '[DEFAULT]') { await base.appMod.deleteApp(app); apps.delete(name); }
  } catch (e) {
    if (p.id !== 'p1') putJSON(FORGET_KEY, [...new Set([...getJSON(FORGET_KEY, []), p.id])]);
    /* p1's default session is also cleared at the next post, because p1 no longer exists */
  }
}
store.on((type, data) => { if (type === 'removed') forget(data); });

/* May this Player's Scores and weekly Sparks leave the device? 'ok', 'needs-age' or 'needs-parent' (docs/adr/0001).
   age is a number or 'adult'; parentOk is when a grown-up gave the Parent step, or null. Both stay on the device. */
export const isUnder13 = p => typeof p?.age === 'number' && p.age < 13;
export function canPost(p = store.player()) {
  if (!p || (p.age !== 'adult' && typeof p.age !== 'number')) return 'needs-age';
  if (isUnder13(p) && !p.parentOk) return 'needs-parent';
  return 'ok';
}

/* The score a board accepts, as the rules check it: an integer from 10 to the board's cap, and even on
   Arena boards (every right answer in the Arena earns an even amount). 0 means the board takes none. */
export function boardScore(board, raw) {
  const cap = board.startsWith('g_') ? MAX_GAME_SCORE : board.startsWith('xp-') ? MAX_WEEK_SPARKS : MAX_SCORE[board.split('-').pop()] || 0;
  let score = Math.min(cap, Math.round(Number(raw) || 0));
  if (!board.startsWith('g_') && !board.startsWith('xp-')) score -= score % 2;
  return score >= 10 ? score : 0;
}

/* The one place anything is posted. Keeps one entry per Player's identity per board; a lower score never replaces a
   higher one (enforced by the rules too). Returns { posted, reason }: reason 'needs-age' or 'needs-parent'
   when that Player may not post (then nothing is loaded or sent), 'low' when the board takes no such
   score, 'not-higher' when the board already holds a higher one. Only the nickname and color of `entry` are sent. */
export async function submit(board, entry, p = store.player()) {
  const score = boardScore(board, entry.score);
  if (!score) return { posted: false, reason: 'low' };
  const gate = canPost(p);
  if (gate !== 'ok') return { posted: false, reason: gate };
  const { uid, db, fs } = await bootWrite(p);
  const ref = fs.doc(db, 'boards', board, 'scores', uid);
  const cur = await fs.getDoc(ref);
  if (cur.exists() && cur.data().score >= score) return { posted: false, reason: 'not-higher' };
  const exp = fs.Timestamp.fromMillis(Date.now() + KEEP_DAYS * 864e5); /* for a Firestore TTL policy on `exp`; TTL needs the Blaze plan, so it is off on Spark */
  await fs.setDoc(ref, { name: entry.name, avatar: entry.avatar, score, ts: fs.serverTimestamp(), exp });
  return { posted: true };
}
/* The weekly Sparks Board of a League. Its id keeps the xp- prefix it had when Sparks were called XP: the id
   is never shown, and keeping it needs no rules change and carries this week's entries over (docs/adr/0003). */
export const weekSparksBoard = (week = weekId(), league) => `xp-week-${week}-${league}`;
/* This week's Sparks total (all play, Practice included) for a Player (the active one by default), to their
   League's weekly Sparks Board, under that Player's own identity. Goes through submit, so the same consent check applies. */
export const postWeekSparks = (league, sparks, p = store.player()) =>
  submit(weekSparksBoard(weekId(), league), { name: p.name, avatar: p.avatar, score: Math.min(MAX_WEEK_SPARKS, sparks) }, p);
/* A World board's top entries, read without signing in. "me" marks only that Player's own entry (the active
   Player by default), and only if they have posted from this browser before. */
export async function top(board, n = 20, p = store.player()) {
  const { db, fs } = await bootRead();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'boards', board, 'scores'), fs.orderBy('score', 'desc'), fs.limit(Math.min(n, 20))));
  const uid = savedUid(p);
  return snap.docs.map(d => ({ name: d.data().name, avatar: d.data().avatar, score: d.data().score, me: !!uid && d.id === uid }));
}

/* Board ids: daily-2026-10-12-challenger and week-2026-W42-challenger */
export const dayId = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
