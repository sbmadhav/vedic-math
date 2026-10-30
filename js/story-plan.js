/* Moved to shared/src/story-plan.ts (openspec change react-typescript, task 3.1), with the Skills that ask a Word
   problem. This file keeps its URL for the Legacy views; build.py publishes the TypeScript with its types taken out and
   points this import at it. Loading js/stories.js stays here, beside it in /js/: the templates and hand-written stories
   load after the first paint and register in the shared module. */
import { storiesNow } from '../shared/src/story-plan.ts';
export * from '../shared/src/story-plan.ts';

let loading = null;
export const loadStories = () => (storiesNow() ? Promise.resolve(storiesNow()) : (loading ||= import('./stories.js').then(() => storiesNow(), e => { loading = null; throw e; }))); /* a failed load (offline) is tried again on the next call */
