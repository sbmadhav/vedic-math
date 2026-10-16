/* The Watch shelf's data (openspec watch-shelf). Loaded only by Watch views, through loadVideos() in js/watch.js,
   never imported statically, so first loads do not carry it. build.py pins and precaches it like every module.

   VIDEOS: every entry plays in the page (youtube-nocookie.com embed). Fields:
   - id: our own slug, unique. yt: the 11-character YouTube id, unique.
   - title: our wording (no clickbait, and never a claim that the methods come from the old scriptures). channel: the YouTube channel's name.
   - duration: seconds, under 720 (12 minutes, MAX_LENGTH in js/watch.js) for every Mode. kind: 'video' or 'short' (vertical).
   - modes: the Modes it suits; a Mode sees its own and the Mode below (Explorer only its own).
   - skills: Skill ids from js/skills (not the v- Trick skills). tricks: Trick ids from js/vedic.js. Both hand-matched.
   - madeForKids: YouTube marks it "made for kids". captions: has English captions (auto-generated count).
   - checked: the date the browser check and the bar were last applied. why: one line on why it is here.
   - critique: optional, true for entries that question whether the methods are Vedic; only with modes ['pro'].
   LINKS: websites and games, Pro only (no modes field), opening in a new tab. history: true lists it on the
   Sutras page's history card. */
const checked = '2026-10-15';

export const VIDEOS = [
  /* ---------- Explorer ---------- */
  { id: 'song-of-the-count', title: 'Sesame Street: Song of the Count', channel: 'Sesame Street', yt: 'ZIniljT5lJI', duration: 124, kind: 'video',
    modes: ['explorer'], skills: ['k-count'], tricks: [], madeForKids: true, captions: true, checked,
    why: 'The Count sings about how much he loves counting things, one by one.' },
  { id: 'count-to-20', title: 'Count to 20', channel: 'Khan Academy Kids', yt: 'K2iUnDgfMsQ', duration: 38, kind: 'video',
    modes: ['explorer'], skills: ['k-count', 'k-teens'], tricks: [], madeForKids: true, captions: true, checked,
    why: 'Count along slowly all the way to twenty, with a picture for every number.' },

  /* ---------- Challenger ---------- */
  { id: 'teens-times-teens', title: 'tecmath: Easy multiplication trick you will actually use', channel: 'tecmath', yt: '_bhvIuVDp7w', duration: 226, kind: 'video',
    modes: ['challenger'], skills: ['4-mult2'], tricks: ['near-base'], madeForKids: false, captions: true, checked,
    why: 'Multiply two teen numbers in your head: add one to the other\'s ones digit, times ten, then add the ones multiplied.' },
  { id: 'under-twenty', title: 'tecmath: Multiply numbers under twenty fast', channel: 'tecmath', yt: 'SEupqNi2Rh8', duration: 451, kind: 'video',
    modes: ['challenger'], skills: ['4-mult2'], tricks: ['near-base'], madeForKids: false, captions: true, checked,
    why: 'A speedy way to multiply numbers between 10 and 20 that beats reaching for a calculator.' },
  { id: 'square-to-100', title: 'tecmath: Square any number up to 100', channel: 'tecmath', yt: 's4w5qyBxs48', duration: 417, kind: 'video',
    modes: ['challenger'], skills: ['6-exp'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'Square a two-digit number by going to the nearest ten and back, then adding the small square.' },
  { id: 'multi-digit', title: 'Math Antics: Multi-digit multiplication', channel: 'mathantics', yt: 'FJ5qLWP3Fqo', duration: 364, kind: 'video',
    modes: ['challenger'], skills: ['4-mult2'], tricks: [], madeForKids: true, captions: true, checked,
    why: 'See exactly how multiplying big numbers works, one column at a time.' },
  { id: 'nines-table', title: 'Easy 9 times table trick', channel: 'Twinkl Educational Publishing', yt: 'c8hyYXepGvI', duration: 13, kind: 'short',
    modes: ['challenger'], skills: ['3-mult'], tricks: ['by9s'], madeForKids: false, captions: true, checked,
    why: 'Write 0 to 9 down the tens and 9 to 0 down the ones, and the whole nines table appears.' },
  { id: 'russian-multiplication', title: 'Russian multiplication (Numberphile)', channel: 'Numberphile', yt: 'HJ_PP5rqLg0', duration: 410, kind: 'video',
    modes: ['challenger'], skills: ['4-mult2'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'Multiply two numbers using only halving and doubling, and find out why it works.' },
  { id: 'crosswise-tecmath', title: 'tecmath: Fast multiplication with Vedic math', channel: 'tecmath', yt: 'kvLjpQ0XGao', duration: 261, kind: 'video',
    modes: ['challenger'], skills: ['4-mult2'], tricks: ['crosswise'], madeForKids: false, captions: true, checked,
    why: 'The vertically and crosswise pattern for multiplying numbers up to three digits in one line.' },
  { id: 'nikhilam-beginners', title: 'Nikhilam multiplication for beginners', channel: 'Pebbles Kids Learning', yt: 'f0W32SwhAwM', duration: 326, kind: 'video',
    modes: ['challenger'], skills: [], tricks: ['near-base', 'from9'], madeForKids: true, captions: true, checked,
    why: 'All from 9 and the last from 10, then multiplying numbers close to 100 such as 97 times 92.' },
  { id: 'square-ending-5', title: 'How to square numbers ending in 5', channel: 'MindYourDecisions', yt: 'oV7Kxm3Zr_c', duration: 120, kind: 'video',
    modes: ['challenger'], skills: [], tricks: ['sq5'], madeForKids: false, captions: true, checked,
    why: 'Square 25, 55 or even 205 with the one-more-than-the-one-before shortcut.' },
  { id: 'elevens-tecmath', title: 'tecmath: Eleven times table trick', channel: 'tecmath', yt: 'l1BezGxm7zg', duration: 310, kind: 'video',
    modes: ['challenger'], skills: ['3-mult'], tricks: ['by11'], madeForKids: false, captions: true, checked,
    why: 'Multiply by 11 by adding neighboring digits, from two-digit numbers up to bigger ones.' },
  { id: 'change-from-zeros', title: 'tecmath: Subtracting with zeros', channel: 'tecmath', yt: 'Qf_45zM68R4', duration: 278, kind: 'video',
    modes: ['challenger'], skills: ['2-sub100', '2-add1000'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'Work out change from 20, 50 or 100 dollars in your head by counting up.' },
  { id: 'square-5-short', title: 'Square any number ending in 5', channel: 'EddieDoesMath', yt: 'cxoWrDEUqtw', duration: 58, kind: 'short',
    modes: ['challenger'], skills: [], tricks: ['sq5'], madeForKids: false, captions: true, checked,
    why: 'A quick Short: square numbers like 35, 95 or 105 in seconds.' },
  { id: 'halve-double-short', title: 'Halve one, double the other', channel: 'EddieDoesMath', yt: '9pVR7fKau_U', duration: 55, kind: 'short',
    modes: ['challenger'], skills: ['4-mult2'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'A bite-size shortcut: halve one number and double the other to make a product easy.' },
  { id: 'elevens-short', title: 'The 11 times table trick', channel: 'Tang Math Games', yt: 'Sw-pRuuV1us', duration: 178, kind: 'short',
    modes: ['challenger'], skills: ['3-mult'], tricks: ['by11'], madeForKids: false, captions: true, checked,
    why: 'A classroom race through the 11 trick, and why the digit sum lands in the middle.' },

  /* ---------- Pro ---------- */
  { id: 'expand-simplify', title: 'Eddie Woo: Expand and simplify expressions', channel: 'Eddie Woo', yt: 'EAyI-yiXaek', duration: 92, kind: 'video',
    modes: ['pro'], skills: ['7-like', '9-expand'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'A friendly classroom walkthrough of how to expand brackets and tidy up the terms.' },
  { id: 'nikhilam-vinculum', title: 'Nikhilam multiplication with vinculums', channel: 'James Glover', yt: 'L9ofWNzHECQ', duration: 382, kind: 'video',
    modes: ['pro'], skills: [], tricks: ['near-base'], madeForKids: false, captions: true, checked,
    why: 'One number above the base and one below: bar numbers make Nikhilam work every time.' },
  { id: 'higher-derivatives', title: '3Blue1Brown: Higher order derivatives', channel: '3Blue1Brown', yt: 'BLkz5LGWihw', duration: 338, kind: 'video',
    modes: ['pro'], skills: ['12-deriv'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'What the second derivative means, shown with pictures: the short chapter of Essence of calculus.' },
  { id: '3d-transformations', title: '3Blue1Brown: Three-dimensional linear transformations', channel: '3Blue1Brown', yt: 'rHLEWRxRGiM', duration: 286, kind: 'video',
    modes: ['pro'], skills: ['11-matrix'], tricks: [], madeForKids: false, captions: true, checked,
    why: 'Watch a 3 by 3 matrix move space: the short chapter of Essence of linear algebra.' },
];

export const LINKS = [
  { id: 'polypad', title: 'Polypad by Mathigon', url: 'https://polypad.amplify.com/', kind: 'site', skills: ['3-frac', '2-place'], tricks: [], checked,
    why: 'A free digital playground of blocks, tiles and number bars to drag around and explore.' },
  { id: 'khan-algebra', title: 'Khan Academy Algebra', url: 'https://www.khanacademy.org/math/algebra', kind: 'site', skills: ['7-twostep', '8-lineq'], tricks: [], checked,
    why: 'Free lessons and practice from simple equations to functions.' },
  { id: 'khan-geometry', title: 'Khan Academy Geometry', url: 'https://www.khanacademy.org/math/geometry', kind: 'site', skills: ['10-triangle', '10-similar'], tricks: [], checked,
    why: 'Free videos and exercises on shapes, angles, triangles and proofs.' },
  { id: 'desmos', title: 'Desmos Graphing Calculator', url: 'https://www.desmos.com/calculator', kind: 'site', skills: ['8-slope', '11-vertex'], tricks: [], checked,
    why: 'A free graphing tool: type an equation and see its shape at once.' },
  { id: 'alcumus', title: 'AoPS Alcumus', url: 'https://artofproblemsolving.com/alcumus', kind: 'game', skills: [], tricks: [], checked,
    why: 'Free adaptive practice with challenging problems matched to your level.' },
  { id: 'nrich-secondary', title: 'NRICH Secondary', url: 'https://nrich.maths.org/students/secondary', kind: 'site', skills: [], tricks: [], checked,
    why: 'Rich, open-ended math challenges from the University of Cambridge.' },
  { id: 'brilliant', title: 'Brilliant courses', url: 'https://brilliant.org/courses/', kind: 'site', skills: [], tricks: [], checked,
    why: 'Hands-on interactive math lessons, with some content free to try.' },
  { id: 'project-euler', title: 'Project Euler', url: 'https://projecteuler.net/', kind: 'game', skills: [], tricks: [], checked,
    why: 'Math puzzles you solve by mixing clever thinking with a bit of programming.' },
  { id: 'vedicmaths-org', title: 'VedicMaths.org', url: 'https://www.vedicmaths.org/', kind: 'site', skills: [], tricks: [], history: true, checked,
    why: 'A long-standing Vedic math resource with an introduction to the sutras, articles and books.' },
  { id: 'wiki-tirtha', title: 'Bharati Krishna Tirtha (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Bharati_Krishna_Tirtha', kind: 'site', skills: [], tricks: [], history: true, checked,
    why: 'The life of the monk and scholar who wrote the 1965 book that made Vedic math famous.' },
  { id: 'wiki-vedic-math', title: 'Vedic Mathematics (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Vedic_Mathematics', kind: 'site', skills: [], tricks: [], history: true, critique: true, checked,
    why: 'A balanced overview of the 1965 book, noting that scholars have not found its sutras in the Vedas.' },
  { id: 'arxiv-critique', title: 'Vedic Mathematics: \'Vedic\' or \'Mathematics\'? (arXiv)', url: 'https://arxiv.org/abs/math/0611347', kind: 'site', skills: [], tricks: [], history: true, critique: true, checked,
    why: 'An academic paper that questions how Vedic and how mathematical the system really is.' },
  { id: 'tnm-debate', title: 'Can maths be Vedic or not? (The News Minute)', url: 'https://www.thenewsminute.com/article/can-maths-be-vedic-or-not-26637', kind: 'site', skills: [], tricks: [], history: true, critique: true, checked,
    why: 'A news piece setting out both sides of the debate over where Vedic math comes from.' },
];
