# How to say the Sutra names

Research for the `sutra-pronunciation` change (October 2026). It covers all 29 names the app shows (16 Sutras and 13 sub-sutras, `js/sutras.js`) and the 17 Sutra strings the Tricks use (`js/vedic.js`, which also name the Sky's Constellations). For each name: the Devanagari, the IAST, a word-by-word check of the meaning, and a respelling kids can read. Audio and the listening page are in `docs/prototypes/sutra-voice/`.

## Sources

- **[T]** Bharati Krishna Tirtha, *Vedic Mathematics* (1965). OCR copies on archive.org: https://archive.org/details/dli.scoerat.13528vedicmathmetics (the list "Sixteen Sutras and their Corollaries") and https://archive.org/details/VedicMathematicsJagatguru. The book's own note on the list: "This list has been compiled from stray references in the text" (its editor, V. S. Agrawala).
- **[MW]** Monier-Williams, *Sanskrit-English Dictionary*, Cologne digital edition: https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/getword.php (entries for nikhila, carama, ūrdhva, tiryak, parāvartya, yuj, śūnya, sāmya, samuccaya, ānurūpya, saṃkalana, vyavakalana, pūraṇa, calana, kalana, yāvat, ūna, vyaṣṭi, samaṣṭi, śeṣa, aṅka, upāntya, antya, dvaya, nyūna, adhika, pūrva, guṇita, guṇaka, guṇya, kevala, saptaka, veṣṭana, lopana, sthāpana, vilokana, ādya, saṃjñā, varga, daśaka).
- **[HiWP]** Hindi Wikipedia, वैदिक गणित (पुस्तक), table of names in Devanagari: https://hi.wikipedia.org/wiki/वैदिक_गणित_(पुस्तक). Used as a cross-check only: it has typos (आधमाधेना..., सोपान्त्यद्वयमन्त्च्यम्, अन्त्ययोर्द्दशकेऽपि).
- **[EnWP]** English Wikipedia, "Vedic Mathematics": https://en.wikipedia.org/wiki/Vedic_Mathematics (scholars including S. G. Dani and Kim Plofker find none of the sutras in the Vedas; the article does not list the names).
- **[SA]** English Wikipedia, "Sanskrit", section "Classical stress accent": https://en.wikipedia.org/wiki/Sanskrit, citing W. Sidney Allen, "Some reflections on the 'penultimate' accent", *Illinois Classical Studies* 8.1 (1983), and Whitney, *Sanskrit Grammar*, sections 80 to 97 (the older Vedic pitch accent).
- **[IPA]** https://en.wikipedia.org/wiki/Help:IPA/Sanskrit; **[VIS]** https://en.wikipedia.org/wiki/Visarga; **[ANU]** https://en.wikipedia.org/wiki/Anusvara.
- **[WC]** Wikimedia Commons audio: Lingua Libre and Wiktionary recordings (files and licenses listed under "Human recordings" below).

## What the research found

1. **The IAST in `js/sutras.js` is right for all 29 names.** It matches Tirtha's own list [T] letter for letter, with standard IAST diacritics where Tirtha's OCR has plain letters. No sandhi, word-break, anusvara or visarga errors. Two points that look like errors are not:
   - Sutra 6 "(Ānurūpye) Śūnyamanyat" with the brackets is Tirtha's own form; Ānurūpye (in proportion) and sub-sutra 1 Ānurūpyeṇa (proportionately) are two different, correct forms of the same word.
   - Sutras 15 Guṇitasamuccayaḥ and 16 Guṇakasamuccayaḥ are both in the list; guṇita is "multiplied" and guṇaka is "multiplier, factor" [MW].
   - Sub-sutra 7: Tirtha prints "Vargañca"; the app's "Vargaṃ ca" is the same words written apart.
   - Sutra 7: Saṅkalana and Saṃkalana are two spellings of one sound [ANU].
2. **`js/vedic.js` (the Tricks, so also the Sky) has two spelling errors and some inconsistencies:**
   - **"Ekādhikena Pūrvena"** (Tricks sq5, recip) and **"Ekanyūnena Pūrvena"** (Trick by9s): the last n of Pūrveṇa is retroflex ṇ (पूर्वेण). Fix to "Pūrveṇa". The Sky's Constellation id does not change (`slug()` drops diacritics: `ekadhikena-purvena`), but `test/sky.test.mjs` names the old spelling.
   - "Nikhilam Navataścaramam Daśataḥ" and "Śūnyam Sāmyasamuccaye" use m where `js/sutras.js` uses ṃ. Both are acceptable (Tirtha writes m, standard IAST writes ṃ before a consonant) and they sound the same; the change makes them match.
   - "Ūrdhva Tiryagbhyām" (no hyphen) and "Guṇita Samuccayaḥ" (two words) differ from `js/sutras.js` but are said the same.
3. **Three English meanings needed the owner's eye** (`js/sutras.js`; all three approved and changed on 2026-10-17):
   - **Sub-sutra 10 Samuccayaguṇitaḥ is reversed.** The app says "The sum of the products"; samuccaya (total) + guṇita (multiplied) is "the product of the sums" [MW], the mirror of Sutra 15. Proposed: "The product of the sums".
   - **Sutra 9 Calana-Kalanābhyām**: "By sequential motion (differences and similarities)" is a later teaching gloss. Literally "by motion and reckoning"; Tirtha uses it for differential calculus [T]. Proposed: "By motion and reckoning (calculus)".
   - **Sub-sutra 4 Kevalaiḥ Saptakaṃ Guṇyāt**: "For 7, the multiplier is 143". Tirtha calls 143 the guṇya, the number to be multiplied [T][MW]; "kevalaiḥ" spells 1-4-3 in the old katapayādi letter code. Proposed: "For 7, multiply by 143".
4. **The built-in voice cannot say these names.** An English voice reads "Ekādhikena" as English letters (diacritics dropped or spelled out); a Hindi voice, where the device has one, drops every final short a ("pūrveṇ"). Only pre-made clips sound the same everywhere.

## How the respelling works

Sanskrit has no strong stress like English. The old Vedic pitch accent was lost in the classical language; what is left is a light, predictable stress [SA], and vowel length (a or ā, i or ī, u or ū) matters far more, because it changes words and is what poetry counts. So the respelling does two things:

- **Length is in the spelling.** Long vowels get spellings English readers hold: **ah** (ā), **ee** (ī), **oo** (ū), **ay** (e), **oh** (o), **ai** or **eye** (ai), **ow** (au). Short ones get quick spellings: **uh** (a), **i** (as in "sit"), **u** (as in "put"). e and o are always long in Sanskrit.
- **One light beat per word, in CAPITALS**, by the classical rule [SA]: the second last syllable if it is heavy (long vowel, or followed by two consonants), otherwise the third last if heavy, otherwise the fourth last. Long compounds are split at their parts with spaces, and each part gets its own beat, so a long name reads in chunks. The capitals mark a small lift, not an English stress; the page that shows the respelling says so.

Sounds that need a note [IPA][VIS][ANU]:

| Letter | Say it like | In the respelling |
|---|---|---|
| c | ch in "chair" (never k) | ch |
| ś, ṣ | sh in "ship" (ṣ with the tongue curled back) | sh |
| ṛ | ri in "rich" (south India: ru) | ri |
| kh, gh, th, dh, ph, bh | the letter with a puff of air; th is never the th in "this" | kh, gh, th, dh, ph, bh |
| ṭ, ḍ, ṇ | t, d, n with the tongue curled back | t, d, n |
| v | between v and w, as in Hindi | v |
| jñ | gy in most of India today (dny or jny in some regions) | gy |
| ṃ | a nasal shaped like the next consonant; m at the end | m, n or ng |
| ḥ | a breath h, with a soft echo of the vowel before it at the end of a word: Daśataḥ is "duh-shuh-tuh-huh" | h plus the vowel |
| ṅ | ng in "sing" | ng |

Every short a is said, including the last one. This is where Hindi differs (Hindi drops a final a: "pūrv", "varg"), and why the clips are not made with Hindi spelling rules.

## The names

S is a Sutra, Sub a sub-sutra. The Devanagari is generated from the IAST by `tools/sutra-voice/sanskrit.mjs` (first written for the listening page) and checked against [HiWP] and [T].

| # | Devanagari | IAST | Respelling | Meaning (app) | Check |
|---|---|---|---|---|---|
| S1 | एकाधिकेन पूर्वेण | Ekādhikena Pūrveṇa | ay-kah-dhi-KAY-nuh poor-VAY-nuh | By one more than the one before | eka one + adhika more; pūrva previous; -ena "by". Fair. vedic.js misspells Pūrvena. |
| S2 | निखिलं नवतश्चरमं दशतः | Nikhilaṃ Navataścaramaṃ Daśataḥ | NI-khi-luhm NUH-vuh-tuhsh CHUH-ruh-muhm DUH-shuh-tuh-huh | All from 9 and the last from 10 | nikhila all; navataḥ from nine (nava + -tas, not navata "90th"); carama last; daśataḥ from ten. Fair. |
| S3 | ऊर्ध्वतिर्यग्भ्याम् | Ūrdhva-Tiryagbhyām | OOR-dhvuh tir-YUHG-bhyahm | Vertically and crosswise | ūrdhva upright; tiryak crosswise; -bhyām "by both". Fair. |
| S4 | परावर्त्य योजयेत् | Parāvartya Yojayet | puh-rah-VUHR-tyuh YOH-juh-yayt | Transpose and apply | parāvartya having turned back; yojayet one should join or apply. Fair (Tirtha: "transpose and adjust"). |
| S5 | शून्यं साम्यसमुच्चये | Śūnyaṃ Sāmyasamuccaye | SHOON-yuhm SAHM-yuh suh-MUCH-chuh-yay | When the totals are the same, that total is zero | śūnya zero; sāmya sameness; samuccaya total, -e "when". Fair. |
| S6 | (आनुरूप्ये) शून्यमन्यत् | (Ānurūpye) Śūnyamanyat | ah-nu-ROOP-yay shoon-yuh-MUHN-yuht | If one is in ratio, the other is zero | ānurūpye in proportion; śūnyam zero; anyat the other. Fair. |
| S7 | सङ्कलनव्यवकलनाभ्याम् | Saṅkalana-Vyavakalanābhyām | SUHNG-kuh-luh-nuh vyuh-vuh-kuh-luh-NAH-bhyahm | By adding and by subtracting | saṃkalana addition; vyavakalana subtraction. Fair. |
| S8 | पूरणापूरणाभ्याम् | Pūraṇāpūraṇābhyām | POO-ruh-nah poo-ruh-NAH-bhyahm | By completing or not completing | pūraṇa completing; apūraṇa not completing. Fair. |
| S9 | चलनकलनाभ्याम् | Calana-Kalanābhyām | CHUH-luh-nuh kuh-luh-NAH-bhyahm | By sequential motion (differences and similarities) | calana motion; kalana reckoning. **Loose**: propose "By motion and reckoning (calculus)". |
| S10 | यावदूनम् | Yāvadūnam | yah-vuh-DOO-nuhm | Whatever the amount of its deficiency | yāvat as much as; ūna deficient. Fair. |
| S11 | व्यष्टिसमष्टिः | Vyaṣṭisamaṣṭiḥ | VYUHSH-ti suh-MUHSH-ti-hi | Part and whole | vyaṣṭi the single part; samaṣṭi the whole. Fair. |
| S12 | शेषाण्यङ्केन चरमेण | Śeṣāṇyaṅkena Carameṇa | shay-shahn-yuhng-KAY-nuh chuh-ruh-MAY-nuh | The remainders by the last digit | śeṣāṇi remainders; aṅkena by the digit; carameṇa by the last. Fair. |
| S13 | सोपान्त्यद्वयमन्त्यम् | Sopāntyadvayamantyam | soh-PAHN-tyuh dvuh-yuh-MUHN-tyuhm | The last and twice the second last | sa with + upāntya second last + dvaya twice; antyam the last. Fair. |
| S14 | एकन्यूनेन पूर्वेण | Ekanyūnena Pūrveṇa | ay-kuhn-yoo-NAY-nuh poor-VAY-nuh | By one less than the one before | eka one; nyūna less; pūrva previous. Fair. vedic.js misspells Pūrvena. |
| S15 | गुणितसमुच्चयः | Guṇitasamuccayaḥ | GU-ni-tuh suh-MUCH-chuh-yuh-huh | The product of the sums is the sum of the product | guṇita multiplied; samuccaya total. Fair as the rule. |
| S16 | गुणकसमुच्चयः | Guṇakasamuccayaḥ | GU-nuh-kuh suh-MUCH-chuh-yuh-huh | The factors of the sum are the sum of the factors | guṇaka multiplier, factor; samuccaya total. Fair. |
| Sub 1 | आनुरूप्येण | Ānurūpyeṇa | ah-nu-roop-YAY-nuh | Proportionately | ānurūpya proportion, -eṇa "by". Fair. |
| Sub 2 | शिष्यते शेषसंज्ञः | Śiṣyate Śeṣasaṃjñaḥ | SHISH-yuh-tay SHAY-shuh SUHN-gyuh-huh | The remainder remains constant | śiṣyate is left; śeṣa remainder; saṃjñā name. Tirtha's reading; fair. |
| Sub 3 | आद्यमाद्येनान्त्यमन्त्येन | Ādyamādyenāntyamantyena | ahd-yuh-mahd-yay-nahn-tyuh-muhn-TYAY-nuh | The first by the first and the last by the last | ādya first, ādyena by the first; antya last, antyena by the last. Fair. |
| Sub 4 | केवलैः सप्तकं गुण्यात् | Kevalaiḥ Saptakaṃ Guṇyāt | KAY-vuh-lai-hi SUHP-tuh-kuhm GUN-yaht | For 7, the multiplier is 143 | kevalaiḥ = 143 in katapayādi; saptaka seven; guṇya to be multiplied. **Check**: propose "For 7, multiply by 143". |
| Sub 5 | वेष्टनम् | Veṣṭanam | VAYSH-tuh-nuhm | By osculation | veṣṭana encircling ("osculation" is Tirtha's word). Fair. |
| Sub 6 | यावदूनं तावदूनम् | Yāvadūnaṃ Tāvadūnam | yah-vuh-DOO-nuhm tah-vuh-DOO-nuhm | Lessen by the deficiency | yāvat ... tāvat as much ... so much; ūna deficient. Fair. |
| Sub 7 | यावदूनं तावदूनीकृत्य वर्गं च योजयेत् | Yāvadūnaṃ Tāvadūnīkṛtya Vargaṃ ca Yojayet | yah-vuh-DOO-nuhm tah-vuh-DOO-nee KRIT-yuh VUHR-guhm chuh YOH-juh-yayt | Lessen by the deficiency and add its square | ūnīkṛtya having lessened; varga square; ca and; yojayet add. Fair. |
| Sub 8 | अन्त्ययोर्दशकेऽपि | Antyayordaśake'pi | UHN-tyuh-yohr duh-shuh-KAY-pi | When the last digits add to ten | antyayoḥ of the two last; daśake in a ten; api also. Fair. ' (avagraha, ऽ) marks a dropped a and is not said. |
| Sub 9 | अन्त्ययोरेव | Antyayoreva | uhn-tyuh-yoh-RAY-vuh | Only the last terms | antyayoḥ of the two last; eva only. Fair. |
| Sub 10 | समुच्चयगुणितः | Samuccayaguṇitaḥ | suh-MUCH-chuh-yuh GU-ni-tuh-huh | The sum of the products | samuccaya total + guṇita multiplied. **Reversed**: should be "The product of the sums". |
| Sub 11 | लोपनस्थापनाभ्याम् | Lopanasthāpanābhyām | LOH-puh-nuh sthah-puh-NAH-bhyahm | By alternate elimination and retention | lopana leaving out; sthāpana keeping. Fair. |
| Sub 12 | विलोकनम् | Vilokanam | vi-LOH-kuh-nuhm | By mere observation | vilokana looking. Fair. |
| Sub 13 | गुणितसमुच्चयः समुच्चयगुणितः | Guṇitasamuccayaḥ Samuccayaguṇitaḥ | GU-ni-tuh suh-MUCH-chuh-yuh-huh suh-MUCH-chuh-yuh GU-ni-tuh-huh | The product of the sums is the sum of the products | as S15 and Sub 10. Fair. |

The Tricks' Sutra strings map onto these 29 names: "Nikhilam (division by 9)" is S2, "Ūrdhva Tiryagbhyām (special case)" and "(duplex)" are S3, "Veṣṭanam (with Ekādhika)" is Sub 5, "Guṇita Samuccayaḥ" is S15. The clip is the name without the bracket.

## Audio: what was tried

All free and local. No paid or cloud speech service was used.

- **Kokoro-82M** (Apache-2.0) through kokoro-js 1.2.1 in Node, fp32 model, with its four Hindi voices: hf_alpha, hf_beta (women), hm_omega, hm_psi (men). kokoro-js only has an English front end, so the clips are made from phonemes: `sanskrit.mjs` turns the IAST into IPA letter by letter (every short a said, ṃ shaped by the next consonant, ḥ with its echo, the light beat marked with ˈ) in the symbols Kokoro's tokenizer knows, and the model reads those directly. Speed 0.85.
- **Hindi rules for comparison**: eSpeak NG's Hindi phonemizer (what Kokoro's own Hindi pipeline uses) on the Devanagari. It drops final short vowels ("ekādhiken pūrveṇ", "Daśat") and turns Sanskrit into Hindi. The listening page has this as a comparison row; it is not a candidate.
- **Kid blends**: the owner asked for a kid's voice. No free model has a natural child voice (the better-voice change surveyed Kokoro, Piper, Kitten TTS, MeloTTS and research child voices). Following better-voice, two blends mix Kokoro voice style vectors with no pitch shifting: Alpha or Beta 70% with Kokoro's lighter Japanese voice (jf_alpha) 30%.
- **The built-in voice** (today's read aloud) on the listening page: an English voice reading the IAST, and a Hindi voice reading the Devanagari where the device has one.

Measured (all 29 names, AAC .m4a mono 24 kHz 32 kbps, as better-voice; "Whisper match" is explained below):

| Voice | All 29 clips | Largest clip | Typical pitch | Whisper match |
|---|---|---|---|---|
| hf_alpha (Alpha, woman) | 374 KB, 58 s | 21 KB | 231 Hz | 0.62 |
| hf_beta (Beta, woman) | 344 KB, 52 s | 19 KB | 188 Hz | 0.63 |
| hm_omega (Omega, man) | 366 KB, 57 s | 20 KB | 128 Hz | 0.62 |
| hm_psi (Psi, man) | 351 KB, 54 s | 19 KB | 140 Hz | 0.62 |
| Kid blend, Beta + Japanese | 351 KB, 53 s | 19 KB | 216 Hz | 0.61 |
| Kid blend, Alpha + Japanese | 369 KB, 57 s | 21 KB | 247 Hz | 0.59 |
| Alpha with Hindi rules (comparison) | 362 KB, 56 s | 21 KB | 231 Hz | 0.61 |

Adult women speak at about 180 to 230 Hz, children of 6 to 10 at about 230 to 300 Hz. Alpha is already at the bottom of the child range; the Alpha blend is only 16 Hz higher. No candidate sounds like a child, and none is claimed to.

### Listen-check without ears

Each clip was transcribed back with Whisper small (open weights, run locally with transformers.js, Hindi mode) and the Devanagari it heard was compared letter by letter with the name (`tools/check.mjs`; 1 is a perfect match). Whisper is a Hindi listener: it writes ṇ as न, drops or adds final vowels, splits compounds into Hindi-looking words and hears the visarga echo as "है". So 0.6 to 0.8 is a good result, a score is a pointer to listen, not a verdict, and Whisper sometimes loops on one syllable (two Sutra 5 clips scored 0.05 because of that, not because of the clip).

What it found:

- **A real bug, fixed.** The first run put the beat mark at the start of the syllable ("ˈʃuːnjəm"). Kokoro's own phonemes put it right before the vowel ("ʃˈuːnjəm"); with the mark first, the model said a short extra vowel before many names, and Whisper heard "अशुन्यम", "अगुनी", "एपुर". With the mark moved, those onsets are gone in all four voices and the average match rose from 0.58 to 0.62 for Alpha.
- **Hindi rules lose the endings.** The eSpeak Hindi row is heard as "पुर्वेन", "चर्मेल", "दश्वता": Hindi spellings without the Sanskrit final a. It scores about the same only because Whisper itself prefers Hindi spellings.
- **The four Hindi voices are close** (0.62 to 0.63). The Alpha kid blend scores lowest (0.59) and twice starts with a "ye" sound (Sutras 1 and 14).
- **Names to listen to first** (lowest for Alpha, or low in every voice): Antyayoreva (sub 9: heard "अंटी यो रीवव", the e and the final a blur), Pūraṇāpūraṇābhyām (S8: heard "पूर्ण आ पूर्ण", the short a between r and ṇ is swallowed), Ādyamādyenāntyamantyena (sub 3: the y after d is weak, heard "आदिम आदिन"), Śiṣyate Śeṣasaṃjñaḥ (sub 2), Guṇakasamuccayaḥ (S16), Sopāntyadvayamantyam (S13), Samuccayaguṇitaḥ (sub 10), and Vyaṣṭisamaṣṭiḥ (S11, weak in the men's voices). If the owner hears a problem, the fix is in that name's `say` spelling in `tools/names.mjs` (for example a compound break) and one name can be remade alone.

## Human recordings

No free-licensed recording of any full Sutra name exists on Wikimedia Commons or Wiktionary (searched October 2026; Forvo is not CC and was not used). Single words exist:

| Word | Language | File | License |
|---|---|---|---|
| एक | Sanskrit | https://upload.wikimedia.org/wikipedia/commons/8/85/LL-Q11059_%28san%29-Pcxr-%E0%A4%8F%E0%A4%95.wav | CC0 |
| एक | Sanskrit | https://upload.wikimedia.org/wikipedia/commons/5/59/LL-Q11059_%28san%29-Sriveenkat-%E0%A4%8F%E0%A4%95.wav | CC BY-SA 4.0 |
| दश | Sanskrit | https://upload.wikimedia.org/wikipedia/commons/2/2f/LL-Q11059_%28san%29-Sriveenkat-%E0%A4%A6%E0%A4%B6.wav | CC BY-SA 4.0 |
| शून्य | Hindi | https://upload.wikimedia.org/wikipedia/commons/7/70/LL-Q1568_%28hin%29-Mauryaar-%E0%A4%B6%E0%A5%82%E0%A4%A8%E0%A5%8D%E0%A4%AF.wav | CC0 |
| वर्ग | Hindi | https://upload.wikimedia.org/wikipedia/commons/8/8d/LL-Q1568_%28hin%29-ATallSteve-%E0%A4%B5%E0%A4%B0%E0%A5%8D%E0%A4%97.wav | CC0 |
| पूर्व | Hindi | https://upload.wikimedia.org/wikipedia/commons/3/39/LL-Q1568_%28hin%29-Medhi_jyoti-%E0%A4%AA%E0%A5%82%E0%A4%B0%E0%A5%8D%E0%A4%B5.wav | CC BY 4.0 |

They confirm single sounds (the Hindi ones say "pūrv" and "varg", without the Sanskrit final a) but cannot be joined into names. A recording of the 29 names by a Sanskrit teacher, released CC0 or CC BY, would be the gold standard; see the open questions in the change's `design.md`.

**Om for the Sutra ambience**: https://commons.wikimedia.org/wiki/File:Om.ogg, a 1.3 second recording by Tito Dutta, **CC0**. Converted to `docs/prototypes/sutra-voice/audio/ambience/om-commons.m4a` (12 KB). "File:Om pro.ogg" by the same speaker is CC BY-SA 3.0 and was not used.
