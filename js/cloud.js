/* Online leaderboards on Firebase (Google Cloud): Firestore plus anonymous sign-in, and App Check when configured.
   Loaded lazily, only when a leaderboard is opened, so it never slows the first view.
   Stores only a generated nickname, an avatar color, a score and two timestamps: no names, emails or ages. */
import { FIREBASE, appCheckSiteKey, appCheckProvider } from './cloud-config.js';

const V = '10.12.2', CDN = `https://www.gstatic.com/firebasejs/${V}`;
/* Score caps and the entry lifetime, mirrored from cloud/firestore.rules (the rules are the authority):
   Arena boards per league, Ranked game boards (g_...) and weekly XP boards (xp-week-...) one cap each. */
export const MAX_SCORE = { explorer: 2000, challenger: 1600, pro: 1200 };
export const MAX_GAME_SCORE = 12000, MAX_WEEK_XP = 60000;
export const KEEP_DAYS = 30;
let ready = null;
export const enabled = () => !!(FIREBASE && FIREBASE.projectId);
export const appCheckOn = () => enabled() && !!appCheckSiteKey;

async function boot() {
  if (!enabled()) throw new Error('off');
  if (ready) return ready;
  ready = (async () => {
    const [{ initializeApp }, auth, fs, ac] = await Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`), import(`${CDN}/firebase-firestore.js`),
      appCheckOn() ? import(`${CDN}/firebase-app-check.js`) : null]);
    const app = initializeApp(FIREBASE);
    if (ac) {
      /* On localhost App Check prints a debug token in the console; add it under App Check > Manage debug tokens. */
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      const Provider = appCheckProvider === 'v3' ? ac.ReCaptchaV3Provider : ac.ReCaptchaEnterpriseProvider;
      ac.initializeAppCheck(app, { provider: new Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
    }
    const a = auth.getAuth(app);
    await a.authStateReady(); /* wait for the saved session, or every visit would sign in as a new player */
    if (!a.currentUser) await auth.signInAnonymously(a);
    return { uid: a.currentUser.uid, db: fs.getFirestore(app), fs };
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

/* The score a board accepts, as the rules check it: an integer from 10 to the board's cap, and even on
   Arena boards (every right answer in the Arena earns an even amount). 0 means the board takes none. */
export function boardScore(board, raw) {
  const cap = board.startsWith('g_') ? MAX_GAME_SCORE : board.startsWith('xp-') ? MAX_WEEK_XP : MAX_SCORE[board.split('-').pop()] || 0;
  let score = Math.min(cap, Math.round(Number(raw) || 0));
  if (!board.startsWith('g_') && !board.startsWith('xp-')) score -= score % 2;
  return score >= 10 ? score : 0;
}

/* Keeps one entry per player per board; a lower score never replaces a higher one (enforced by the rules too). */
export async function submit(board, entry) {
  const score = boardScore(board, entry.score);
  if (!score) return false;
  const { uid, db, fs } = await boot();
  const ref = fs.doc(db, 'boards', board, 'scores', uid);
  const cur = await fs.getDoc(ref);
  if (cur.exists() && cur.data().score >= score) return false;
  const exp = fs.Timestamp.fromMillis(Date.now() + KEEP_DAYS * 864e5); /* for a Firestore TTL policy on `exp`; TTL needs the Blaze plan, so it is off on Spark */
  await fs.setDoc(ref, { name: entry.name, avatar: entry.avatar, score, ts: fs.serverTimestamp(), exp });
  return true;
}
export async function top(board, n = 20) {
  const { uid, db, fs } = await boot();
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'boards', board, 'scores'), fs.orderBy('score', 'desc'), fs.limit(Math.min(n, 20))));
  return snap.docs.map(d => ({ name: d.data().name, avatar: d.data().avatar, score: d.data().score, me: d.id === uid }));
}

/* Board ids: daily-2026-10-12-challenger and week-2026-W42-challenger */
export const dayId = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), wk = Math.ceil(((t - y0) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}
