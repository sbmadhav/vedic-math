// Expect: no-restricted-imports (the question sets never import the band module, openspec change age-bands, design decision 5; linted as shared/src/questions.ts)
import { RULES } from './bands.ts';

export const choices = (): number => RULES.early.choices;
