/* Placement (openspec placement): the climb's engine lives in shared/src/placement.ts; this file keeps a js/ URL for the
   Legacy view (js/placement-view.js) and the e2e specs (e2eMod('placement')). build.py publishes the TypeScript with its
   types taken out and points this import at it. */
export * from '../shared/src/placement.ts';
