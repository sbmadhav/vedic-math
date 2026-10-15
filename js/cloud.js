/* Online leaderboards on Firebase (Google Cloud): Firestore, plus anonymous sign-in only for posting, and App Check when configured.
   Loaded lazily, only when a World board is opened or something is posted, so it never slows the first view.
   Stores only a generated nickname, an avatar color, a score and two timestamps: no names, emails or ages.
   Two rules from docs/adr: nothing is posted for a Player without an Age answer, or under 13 without the
   Parent step (canPost, checked inside submit so no caller can skip it); and no identity exists until the
   first post (viewing a World board loads no Auth and never signs in). */
import { FIREBASE, appCheckSiteKey, appCheckProvider } from './cloud-config.js';
import * as store from './store.js';

const V = '10.12.2', CDN = `https://www.gstatic.com/firebasejs/${V}`;
/* Score caps and the entry lifetime, mirrored from cloud/firestore.rules (the rules are the authority):
   Arena boards per league, Ranked game boards (g_...) and weekly XP boards (xp-week-...) one cap each. */
export const MAX_SCORE = { explorer: 2000, challenger: 1600, pro: 1200 };
export const MAX_GAME_SCORE = 12000, MAX_WEEK_XP = 60000;
export const KEEP_DAYS = 30;
export const enabled = () => !!(FIREBASE && FIREBASE.projectId);
export const appCheckOn = () => enabled() && !!appCheckSiteKey;

/* How the SDK files load. Tests swap it for stubs (see test/cloud.test.mjs). */
let load = url => import(url);
let read = null, write = null;
export function _setLoader(fn) { load = fn || (url => import(url)); read = write = null; }

/* The anonymous id this device posted under, kept here after the first post so a World board can mark
   "me" without loading Auth. Firebase already keeps the same id in this browser; nothing new leaves it. */
const UID_KEY = 'vm.cloudUid';
const savedUid = () => { try { return localStorage.getItem(UID_KEY); } catch (e) { return null; } };
const saveUid = uid => { try { localStorage.setItem(UID_KEY, uid); } catch (e) {} };

/* Reading: the app, Firestore and App Check. No Auth: list queries need no sign-in. */
function bootRead() {
  if (!enabled()) return Promise.reject(new Error('off'));
  if (read) return read;
  read = (async () => {
    const [{ initializeApp }, fs, ac] = await Promise.all([load(`${CDN}/firebase-app.js`), load(`${CDN}/firebase-firestore.js`),
      appCheckOn() ? load(`${CDN}/firebase-app-check.js`) : null]);
    const app = initializeApp(FIREBASE);
    if (ac) {
      /* On localhost App Check prints a debug token in the console; add it under App Check > Manage debug tokens. */
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      const Provider = appCheckProvider === 'v3' ? ac.ReCaptchaV3Provider : ac.ReCaptchaEnterpriseProvider;
      ac.initializeAppCheck(app, { provider: new Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    }
    return { app, db: fs.getFirestore(app), fs };
  })();
  read.catch(() => { read = null; });
  return read;
}
/* Posting: adds Auth and the anonymous sign-in. Only a permitted submit reaches this. */
function bootWrite() {
  if (write) return write;
  write = (async () => {
    const [{ app, db, fs }, auth] = await Promise.all([bootRead(), load(`${CDN}/firebase-auth.js`)]);
    const a = auth.getAuth(app);
    await a.authStateReady(); /* wait for the saved session, or every post would sign in as a new player */
    if (!a.currentUser) await auth.signInAnonymously(a);
    saveUid(a.currentUser.uid);
    return { uid: a.currentUser.uid, db, fs };
  })();
  write.catch(() => { write = null; });
  return write;
}

/* May this Player's Scores and XP leave the device? 'ok', 'needs-age' or 'needs-parent' (docs/adr/0001).
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
  const cap = board.startsWith('g_') ? MAX_GAME_SCORE : board.startsWith('xp-') ? MAX_WEEK_XP : MAX_SCORE[board.split('-').pop()] || 0;
  let score = Math.min(cap, Math.round(Number(raw) || 0));
  if (!board.startsWith('g_') && !board.startsWith('xp-')) score -= score % 2;
  return score >= 10 ? score : 0;
}

/* The one place anything is posted. Keeps one entry per identity per board; a lower score never replaces a
   higher one (enforced by the rules too). Returns { posted, reason }: reason 'needs-age' or 'needs-parent'
   when the active Player may not post (then nothing is loaded or sent), 'low' when the board takes no such
   score, 'not-higher' when the board already holds a higher one. Only the nickname and color of `entry` are sent. */
export async function submit(board, entry) {
  const score = boardScore(board, entry.score);
  if (!score) return { posted: false, reason: 'low' };
  const gate = canPost();
  if (gate !== 'ok') return { posted: false, reason: gate };
  const { uid, db, fs } = await bootWrite();
  const ref = fs.doc(db, 'boards', board, 'scores', uid);
  const cur = await fs.getDoc(ref);
  if (cur.exists() && cur.data().score >= score) return { posted: false, reason: 'not-higher' };
  const exp = fs.Timestamp.fromMillis(Date.now() + KEEP_DAYS * 864e5); /* for a Firestore TTL policy on `exp`; TTL needs the Blaze plan, so it is off on Spark */
  await fs.setDoc(ref, { name: entry.name, avatar: entry.avatar, score, ts: fs.serverTimestamp(), exp });
  return { posted: true };
}
/* This week's XP total (all play, Practice included) for the active Player, to their League's weekly XP board.
   Goes through submit, so the same consent check applies. */
export const postWeekXP = (league, xp, p = store.player()) =>
  submit(`xp-week-${weekId()}-${league}`, { name: p.name, avatar: p.avatar, score: Math.min(MAX_WEEK_XP, xp) });
/* A World board's top entries, read without signing in. "me" marks this device's entry only if it has posted before. */
export async function top(board, n = 20) {
  const { db, fs } = await bootRead();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'boards', board, 'scores'), fs.orderBy('score', 'desc'), fs.limit(Math.min(n, 20))));
  const uid = savedUid();
  return snap.docs.map(d => ({ name: d.data().name, avatar: d.data().avatar, score: d.data().score, me: !!uid && d.id === uid }));
}

/* Board ids: daily-2026-10-12-challenger and week-2026-W42-challenger */
export const dayId = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
