/* Shared by the inventory and the clip maker: how a normalized sentence becomes clips.
   Numbers become number clips (0 to 99 are one clip each, then hundred, thousand, million, point);
   the words between numbers are frames; punctuation-only runs are pauses. A number that ends a
   sentence uses the falling ("end") take of its last clip, written with a trailing dot in the id. */
export function numClips(s, last = false) {
  const out = []; const [int, dec] = s.replace('-', '').split('.'); if (s.startsWith('-')) out.push('w:negative');
  const n = +int;
  const under1000 = v => { const r = []; if (v >= 100) { r.push('n:' + Math.floor(v / 100), 'w:hundred'); v %= 100; if (v) r.push('n:' + v); } else r.push('n:' + v); return r; };
  if (n >= 1e6) { out.push(...under1000(Math.floor(n / 1e6)), 'w:million'); const rest = n % 1e6; if (rest >= 1000) out.push(...under1000(Math.floor(rest / 1000)), 'w:thousand'); if (rest % 1000) out.push(...under1000(rest % 1000)); }
  else if (n >= 1000) { out.push(...under1000(Math.floor(n / 1000)), 'w:thousand'); if (n % 1000) out.push(...under1000(n % 1000)); }
  else out.push(...under1000(n));
  if (dec !== undefined) { out.push('w:point'); for (const c of dec) out.push('n:' + c); }
  if (last) out[out.length - 1] += '.';
  return out;
}
export function splitParts(text) {
  const toks = text.split(' '), parts = []; let cur = [];
  const flush = () => { if (cur.length) parts.push({ f: cur.join(' ') }); cur = []; };
  toks.forEach((tk, i) => {
    const m = tk.match(/^(-?\d+(?:\.\d+)?)([,.?!:]?)$/);
    if (m) { flush(); parts.push({ n: m[1], last: !!m[2] && m[2] !== ',' || i === toks.length - 1 }); if (m[2]) parts.push({ pause: m[2] === ',' ? 'short' : 'long' }); }
    else cur.push(tk);
  });
  flush();
  return parts;
}
