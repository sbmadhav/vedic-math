/* Every Sutra and sub-sutra name the app shows (js/sutras.js), with the IAST the clips are made from.
   app: the spelling in js/sutras.js today; iast: the checked spelling (see docs/sutra-pronunciation.md).
   say: the IAST with | between compound members (sets the beat syllables and the respelling chunks).
   meaning: the English in js/sutras.js today; note: what the research found (see docs/sutra-pronunciation.md).
   id: the clip file name. */
export const NAMES = [
  { id: 's01', kind: 'Sutra', n: 1, app: 'Ekādhikena Pūrveṇa', iast: 'Ekādhikena Pūrveṇa', say: 'Ekādhikena Pūrveṇa', meaning: 'By one more than the one before', note: "js/vedic.js spells it 'Ekādhikena Pūrvena' (Tricks sq5 and recip): the last n should be ṇ, as here and in js/sutras.js." },
  { id: 's02', kind: 'Sutra', n: 2, app: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', iast: 'Nikhilaṃ Navataścaramaṃ Daśataḥ', say: 'Nikhilaṃ Navataś|caramaṃ Daśataḥ', meaning: 'All from 9 and the last from 10', note: "js/vedic.js writes 'Nikhilam Navataścaramam' with m (Tirtha's own spelling); js/sutras.js uses ṃ (standard IAST). Both are said the same." },
  { id: 's03', kind: 'Sutra', n: 3, app: 'Ūrdhva-Tiryagbhyām', iast: 'Ūrdhva-Tiryagbhyām', say: 'Ūrdhva|Tiryagbhyām', meaning: 'Vertically and crosswise' },
  { id: 's04', kind: 'Sutra', n: 4, app: 'Parāvartya Yojayet', iast: 'Parāvartya Yojayet', say: 'Parāvartya Yojayet', meaning: 'Transpose and apply' },
  { id: 's05', kind: 'Sutra', n: 5, app: 'Śūnyaṃ Sāmyasamuccaye', iast: 'Śūnyaṃ Sāmyasamuccaye', say: 'Śūnyaṃ Sāmya|samuccaye', meaning: 'When the totals are the same, that total is zero', note: "js/vedic.js writes 'Śūnyam' with m; js/sutras.js 'Śūnyaṃ'. Same sound." },
  { id: 's06', kind: 'Sutra', n: 6, app: '(Ānurūpye) Śūnyamanyat', iast: 'Ānurūpye Śūnyamanyat', say: 'Ānurūpye Śūnyamanyat', meaning: 'If one is in ratio, the other is zero', note: "The brackets are Tirtha's: Ānurūpye is sometimes left off. The clip says both words." },
  { id: 's07', kind: 'Sutra', n: 7, app: 'Saṅkalana-Vyavakalanābhyām', iast: 'Saṅkalana-Vyavakalanābhyām', say: 'Saṅkalana|Vyavakalanābhyām', meaning: 'By adding and by subtracting' },
  { id: 's08', kind: 'Sutra', n: 8, app: 'Pūraṇāpūraṇābhyām', iast: 'Pūraṇāpūraṇābhyām', say: 'Pūraṇā|pūraṇābhyām', meaning: 'By completing or not completing' },
  { id: 's09', kind: 'Sutra', n: 9, app: 'Calana-Kalanābhyām', iast: 'Calana-Kalanābhyām', say: 'Calana|Kalanābhyām', meaning: 'By sequential motion (differences and similarities)', note: "Meaning to check: 'differences and similarities' is a later teaching gloss. Literally 'by motion and reckoning'; Tirtha uses it for calculus." },
  { id: 's10', kind: 'Sutra', n: 10, app: 'Yāvadūnam', iast: 'Yāvadūnam', say: 'Yāvadūnam', meaning: 'Whatever the amount of its deficiency' },
  { id: 's11', kind: 'Sutra', n: 11, app: 'Vyaṣṭisamaṣṭiḥ', iast: 'Vyaṣṭisamaṣṭiḥ', say: 'Vyaṣṭi|samaṣṭiḥ', meaning: 'Part and whole' },
  { id: 's12', kind: 'Sutra', n: 12, app: 'Śeṣāṇyaṅkena Carameṇa', iast: 'Śeṣāṇyaṅkena Carameṇa', say: 'Śeṣāṇyaṅkena Carameṇa', meaning: 'The remainders by the last digit' },
  { id: 's13', kind: 'Sutra', n: 13, app: 'Sopāntyadvayamantyam', iast: 'Sopāntyadvayamantyam', say: 'Sopāntya|dvayamantyam', meaning: 'The last and twice the second last' },
  { id: 's14', kind: 'Sutra', n: 14, app: 'Ekanyūnena Pūrveṇa', iast: 'Ekanyūnena Pūrveṇa', say: 'Ekanyūnena Pūrveṇa', meaning: 'By one less than the one before', note: "js/vedic.js spells it 'Ekanyūnena Pūrvena' (Trick by9s): the last n should be ṇ." },
  { id: 's15', kind: 'Sutra', n: 15, app: 'Guṇitasamuccayaḥ', iast: 'Guṇitasamuccayaḥ', say: 'Guṇita|samuccayaḥ', meaning: 'The product of the sums is the sum of the product', note: "js/vedic.js writes it as two words, 'Guṇita Samuccayaḥ'. One compound in Tirtha's list; said the same." },
  { id: 's16', kind: 'Sutra', n: 16, app: 'Guṇakasamuccayaḥ', iast: 'Guṇakasamuccayaḥ', say: 'Guṇaka|samuccayaḥ', meaning: 'The factors of the sum are the sum of the factors' },
  { id: 'u01', kind: 'Sub-sutra', n: 1, app: 'Ānurūpyeṇa', iast: 'Ānurūpyeṇa', say: 'Ānurūpyeṇa', meaning: 'Proportionately' },
  { id: 'u02', kind: 'Sub-sutra', n: 2, app: 'Śiṣyate Śeṣasaṃjñaḥ', iast: 'Śiṣyate Śeṣasaṃjñaḥ', say: 'Śiṣyate Śeṣa|saṃjñaḥ', meaning: 'The remainder remains constant', note: "jñ is said 'gy' in most of India today; some regions say 'dny' or 'jny'." },
  { id: 'u03', kind: 'Sub-sutra', n: 3, app: 'Ādyamādyenāntyamantyena', iast: 'Ādyamādyenāntyamantyena', say: 'Ādyamādyenāntyamantyena', meaning: 'The first by the first and the last by the last' },
  { id: 'u04', kind: 'Sub-sutra', n: 4, app: 'Kevalaiḥ Saptakaṃ Guṇyāt', iast: 'Kevalaiḥ Saptakaṃ Guṇyāt', say: 'Kevalaiḥ Saptakaṃ Guṇyāt', meaning: 'For 7, the multiplier is 143', note: "Meaning to check: Tirtha calls 143 the number to be multiplied (guṇya), not the multiplier. 'For 7, multiply by 143' avoids the question. Kevalaiḥ codes 143 in the old katapayādi letter-number code." },
  { id: 'u05', kind: 'Sub-sutra', n: 5, app: 'Veṣṭanam', iast: 'Veṣṭanam', say: 'Veṣṭanam', meaning: 'By osculation' },
  { id: 'u06', kind: 'Sub-sutra', n: 6, app: 'Yāvadūnaṃ Tāvadūnam', iast: 'Yāvadūnaṃ Tāvadūnam', say: 'Yāvadūnaṃ Tāvadūnam', meaning: 'Lessen by the deficiency' },
  { id: 'u07', kind: 'Sub-sutra', n: 7, app: 'Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet', iast: 'Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet', say: 'Yāvadūnaṃ Tāvadūnī|kṛtya Vargaṃ ca Yojayet', meaning: 'Lessen by the deficiency and add its square', note: "Tirtha prints 'Vargañca'; 'Vargaṃ ca' is the same words, written apart." },
  { id: 'u08', kind: 'Sub-sutra', n: 8, app: "Antyayordaśake'pi", iast: "Antyayordaśake'pi", say: "Antyayor|daśake'pi", meaning: 'When the last digits add to ten' },
  { id: 'u09', kind: 'Sub-sutra', n: 9, app: 'Antyayoreva', iast: 'Antyayoreva', say: 'Antyayoreva', meaning: 'Only the last terms' },
  { id: 'u10', kind: 'Sub-sutra', n: 10, app: 'Samuccayaguṇitaḥ', iast: 'Samuccayaguṇitaḥ', say: 'Samuccaya|guṇitaḥ', meaning: 'The sum of the products', note: "Meaning is reversed in the app: samuccaya (total) + guṇita (multiplied) is 'the product of the sums', not 'the sum of the products'." },
  { id: 'u11', kind: 'Sub-sutra', n: 11, app: 'Lopanasthāpanābhyām', iast: 'Lopanasthāpanābhyām', say: 'Lopana|sthāpanābhyām', meaning: 'By alternate elimination and retention' },
  { id: 'u12', kind: 'Sub-sutra', n: 12, app: 'Vilokanam', iast: 'Vilokanam', say: 'Vilokanam', meaning: 'By mere observation' },
  { id: 'u13', kind: 'Sub-sutra', n: 13, app: 'Guṇitasamuccayaḥ Samuccayaguṇitaḥ', iast: 'Guṇitasamuccayaḥ Samuccayaguṇitaḥ', say: 'Guṇita|samuccayaḥ Samuccaya|guṇitaḥ', meaning: 'The product of the sums is the sum of the products' }
];
