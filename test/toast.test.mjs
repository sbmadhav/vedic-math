/* Toasts never cover the primary action (openspec find-and-home-polish): toastSide() in js/fx.js picks the edge. */
import test from 'node:test';
import assert from 'node:assert/strict';

const node = () => ({ classList: { add() {}, toggle() {}, remove() {} }, setAttribute() {}, append() {}, remove() {}, getContext: () => null });
globalThis.document = { querySelector: () => node(), createElement: node, body: node(), hidden: true };
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: true });
const { toastSide, PRIMARY, PADS } = await import('../js/fx.js');

test('toastSide: the bottom when it is clear, the top while a round shows its pad or a primary button is low', () => {
  assert.equal(toastSide(844, 52, []), 'bottom', 'nothing to cover');
  assert.equal(toastSide(844, 52, [{ top: 400, bottom: 444 }]), 'bottom', 'a primary button mid-screen');
  // The live audit at 390 x 844: the Star's number pad ran from 494 to 773, and a Badge earned toast sat at 772 to 824
  assert.equal(toastSide(844, 52, [{ top: 494, bottom: 773, pad: true }]), 'top');
  assert.equal(toastSide(844, 52, [{ top: 404, bottom: 683, pad: true }]), 'top', 'a pad moves as feedback shows, so any pad on screen counts');
  assert.equal(toastSide(844, 52, [{ top: 740, bottom: 784 }]), 'top', 'a primary button in the bottom band');
  assert.equal(toastSide(844, 52, [{ top: 600, bottom: 765 }]), 'top', 'less than 12 px of clearance counts as covering');
  // Both edges busy: the edge that covers less
  assert.equal(toastSide(844, 60, [{ top: 0, bottom: 200 }, { top: 790, bottom: 800 }]), 'bottom');
});

test('the primary actions it keeps clear', () => {
  for (const sel of ['.star-pad', '.ar-pad', '.star-choices', '.ar-choices']) assert.ok(PADS.split(', ').includes(sel), sel);
  assert.equal(PRIMARY, '.md-btn--primary');
});
