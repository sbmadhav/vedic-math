/* The landing page's background sky: the full scene (js/sky-bg.js), unless this device switched the Moving background
   off in the game (vm.bg). It only reads storage, and loads no game module. It starts after the page has loaded and the
   browser is idle, and runs for the life of the page. */
import { mountSkyBg } from './sky-bg.js';

let on = true;
try { on = localStorage.getItem('vm.bg') !== '0'; } catch (e) {}
if (on) mountSkyBg({ signal: new AbortController().signal, level: 'full' });
