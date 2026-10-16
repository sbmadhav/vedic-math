/* Bolt, the robot who teaches (openspec star-round): one inline SVG with six poses. Colors come from CSS classes on
   design tokens (math.css, "Bolt"), never from the SVG, so Bolt follows both color schemes. The image is hidden from
   assistive technology; what Bolt says is always text on the page. */
export const POSES = ['idle', 'think', 'surprised', 'explain', 'cheer', 'wink'];
const SPARK_PATH = 'M0-11C1.5-2 2-1.5 11 0C2 1.5 1.5 2 0 11C-1.5 2-2 1.5-11 0C-2-1.5-1.5-2 0-11Z';
export const BOLT_SVG = `<svg class="bolt" viewBox="-6 -14 172 190" aria-hidden="true" focusable="false" data-pose="idle">
<g class="b-spark"><path transform="translate(14 14) scale(.9)" d="${SPARK_PATH}" class="b-tip"/><path transform="translate(150 20) scale(.7)" d="${SPARK_PATH}" class="b-tip"/></g>
<line x1="80" y1="34" x2="80" y2="14" class="b-ln" stroke-width="5"/><circle cx="80" cy="12" r="9" class="b-ball"/>
<g class="b-arm b-arm-l"><rect x="16" y="66" width="14" height="30" rx="7" class="b-armr"/></g>
<g class="b-arm b-arm-r"><line x1="137" y1="94" x2="137" y2="142" class="b-ln b-stick" stroke-width="4"/><circle cx="137" cy="146" r="6" class="b-tip b-stick"/><rect x="130" y="66" width="14" height="30" rx="7" class="b-armr"/></g>
<rect x="26" y="34" width="108" height="88" rx="30" class="b-body"/>
<rect x="38" y="48" width="84" height="56" rx="20" class="b-screen"/>
<g class="b-eye b-eye-l"><circle cx="62" cy="72" r="12" class="b-white"/></g>
<g class="b-eye b-eye-r"><circle cx="98" cy="72" r="12" class="b-white"/></g>
<g class="b-pupils"><g class="b-eye b-eye-l"><circle cx="62" cy="72" r="5.5" class="b-pupil"/></g><g class="b-eye b-eye-r"><circle cx="98" cy="72" r="5.5" class="b-pupil"/></g></g>
<path class="b-happy b-ln" stroke-width="4" d="M52 76 q10 -13 20 0 M88 76 q10 -13 20 0"/>
<path class="b-wink b-ln" stroke-width="4" d="M52 73 q10 7 20 0"/>
<path class="m m-smile b-ln" stroke-width="4" d="M68 92 q12 9 24 0"/>
<path class="m m-hmm b-ln" stroke-width="4" d="M70 95 q5 -4 10 0 t10 0"/>
<ellipse class="m m-o b-grin" cx="80" cy="95" rx="6" ry="7"/>
<path class="m m-talk b-grin" d="M70 90 q10 10 20 0 z"/>
<path class="m m-grin b-grin" d="M65 88 h30 q0 13 -15 13 q-15 0 -15 -13 z"/>
<circle cx="48" cy="90" r="5" class="b-cheek"/><circle cx="112" cy="90" r="5" class="b-cheek"/>
<rect x="50" y="122" width="60" height="36" rx="14" class="b-belly"/><circle cx="80" cy="140" r="7" class="b-btn"/>
</svg>`;
const check = name => { if (!POSES.includes(name)) throw new RangeError(`bolt.js: unknown pose ${name}`); return name; };
/* Bolt's markup in a pose */
export const boltHTML = (name = 'idle') => BOLT_SVG.replace('data-pose="idle"', `data-pose="${check(name)}"`);
/* Puts the Bolt in el (the svg itself or an element holding one) in a pose */
export function pose(el, name) {
  check(name);
  const svg = el && (el.matches && el.matches('svg.bolt') ? el : el.querySelector && el.querySelector('svg.bolt'));
  if (svg) svg.setAttribute('data-pose', name);
  return svg || null;
}
