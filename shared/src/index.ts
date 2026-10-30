/* Code the game (app/) and the Worker (workers/) both use (openspec change react-typescript, design D11; task 3.1):
   question generators and the Skill map, the Tricks, the pictures, Arena question sets, scoring, Nickname lists, the
   markup allow-list and message types. The security policy is shared/src/policy.json. Checked without DOM types, so
   nothing here can use the page. The Legacy views reach these modules through their old js/ URLs. */
export * from './lib.ts';
export * from './question.ts';
export * from './skills/index.ts';
export * from './vedic.ts';
export { FAMILIES, mentalQ, sutraOfProduct, sutraOfSquare, type Family, type MentalQuestion } from './mental.ts';
export * from './questions.ts';
export * from './scoring.ts';
export * from './names.ts';
export * from './markup.ts';
export * from './messages.ts';
export * as viz from './viz.ts';
