/* Mathematics in Sanskrit verse (openspec sanskrit-verses): genuine verses, sutras and mantras about mathematics from
   older Indian texts, shown on the Sutras page. Researched and checked against primary texts (GRETIL, TITUS, printed
   editions on archive.org, Wisdom Library) and scholarship; each item lists the pages actually read in refs.
   The 16 sutras of the 1965 book are not verses and are not among these (see honest-framing); the one verse that book
   does contain, the gopi bhagya verse for pi/10, is included and labelled as Tirtha's own.
   Fields: group (vedic | classical | codes), kind (verse | sutra | mantra), deva (Devanagari), iast, say (a respelling
   with the stressed syllable in capitals), words [[sanskrit, english]], meaning, plain (for a young reader), math,
   source, note (what a reader must know), related (Sutra ids with a real mathematical link), refs [[title, url]]. */

export const GROUPS = [
  { id: 'vedic', title: 'From the Vedic texts', blurb: 'Verses and rules found in the Vedas and their helper texts: number names, the calendar, and the rope geometry of fire altars.' },
  { id: 'classical', title: 'From India\'s great mathematicians', blurb: 'Rules written as short poems so they could be learned by heart, from Pingala to Bhaskara.' },
  { id: 'codes', title: 'Numbers hidden in words', blurb: 'Kerala mathematicians wrote numbers as words and syllables. The last verse here is the one verse in the 1965 book.' }
];

export const SLOKAS = [
 {
  "id": "vedanga-jyotisa-crest",
  "group": "vedic",
  "title": "Like the crest of a peacock",
  "kind": "verse",
  "meter": "anuṣṭubh",
  "deva": "यथा शिखा मयूराणां नागानां मणयो यथा ।\nतद्वद्वेदाङ्गशास्त्राणां ज्योतिषं मूर्धनि स्थितम् ॥",
  "iast": "yathā śikhā mayūrāṇāṃ nāgānāṃ maṇayo yathā |\ntadvad vedāṅgaśāstrāṇāṃ jyotiṣaṃ mūrdhani sthitam ||",
  "say": "YA-thaa SHI-khaa ma-yoo-RAA-naam naa-GAA-naam MA-na-yo YA-thaa | TA-dvad vay-daang-ga-shaas-TRAA-naam JYO-ti-sham MOOR-dha-ni STHI-tam",
  "words": [
   [
    "yathā",
    "just as"
   ],
   [
    "śikhā",
    "the crests"
   ],
   [
    "mayūrāṇāṃ",
    "of peacocks"
   ],
   [
    "nāgānāṃ",
    "of cobras"
   ],
   [
    "maṇayaḥ",
    "the jewels (on their hoods)"
   ],
   [
    "yathā",
    "just as"
   ],
   [
    "tadvat",
    "in the same way"
   ],
   [
    "vedāṅgaśāstrāṇāṃ",
    "of the sciences that are limbs of the Veda"
   ],
   [
    "jyotiṣaṃ",
    "jyotiṣa, the science of time-reckoning by the sky (variant: gaṇitaṃ, calculation)"
   ],
   [
    "mūrdhani",
    "at the head"
   ],
   [
    "sthitam",
    "stands"
   ]
  ],
  "meaning": "Like the crests on the heads of peacocks and the jewels on the hoods of cobras, jyotiṣa (in a widely quoted variant: gaṇita, calculation) stands at the head of the Vedāṅga sciences.",
  "plain": "An old book about the calendar says that counting and calculating is the shiny crown on top of all the helper subjects that support the Vedas.",
  "math": "Praise of calculation (calendar astronomy) as the foremost auxiliary science",
  "source": "Vedāṅga Jyotiṣa of Lagadha: Ārca (Ṛgveda) recension verse 35, Yājuṣa (Yajurveda) recension verse 4. Date disputed: the sky it describes fits roughly 1400 to 1200 BCE, but its language points to the last centuries BCE (Witzel, Pingree, Plofker), and some argue for later still.",
  "note": "The printed texts checked (GRETIL Ārca 35, K. V. Sarma ed.; sanskritdocuments Yājuṣa 4) read jyotiṣaṃ. The popular reading gaṇitaṃ (\"mathematics\") is the one quoted by Datta and Singh (History of Hindu Mathematics, citing \"Veda. Jyot. 4\") and by later writers; treat it as a variant. Jyotiṣa here means calendar astronomy for timing rituals, not astrology in the modern sense and not mathematics in general.",
  "related": [],
  "refs": [
   [
    "GRETIL: Lagadha, Ṛgveda-Vedāṅgajyotiṣa (K. V. Sarma ed.)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_lagadha-RgvedavedAGgajyotiSa.txt"
   ],
   [
    "sanskritdocuments.org: Yājuṣa Jyotiṣa",
    "https://sanskritdocuments.org/doc_z_misc_sociology_astrology/yaajuShajyotiSha.html"
   ],
   [
    "Dharmawiki: Ganita Shastra (cites Datta and Singh, History of Hindu Mathematics, p. 7)",
    "https://dharmawiki.org/index.php/Ganita_Shastra_(%E0%A4%97%E0%A4%A3%E0%A4%BF%E0%A4%A4%E0%A4%B6%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%8D%E0%A4%B0%E0%A4%AE%E0%A5%8D)"
   ],
   [
    "A. K. Dutta, Mathematics in Ancient India (Resonance), quotes the gaṇitam reading",
    "https://www.ms.uky.edu/~sohum/ma330/files/DuttaSriramarticle.pdf"
   ],
   [
    "arXiv 2506.02216: Mathematics, a missing factor in assessing the antiquity of Vedāṅga Jyotiṣa (dating survey)",
    "https://arxiv.org/pdf/2506.02216"
   ],
   [
    "Wikipedia: Vedanga Jyotisha (dating views)",
    "https://en.wikipedia.org/wiki/Vedanga_Jyotisha"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "yajurveda-number-names",
  "group": "vedic",
  "title": "Names for powers of ten",
  "kind": "mantra",
  "meter": "",
  "deva": "इमा मे अग्न इष्टका धेनवः सन्त्वेका च दश च दश च शतं च शतं च सहस्रं च सहस्रं चायुतं चायुतं च नियुतं च नियुतं च प्रयुतं चार्बुदं च न्यर्बुदं समुद्रश्च मध्यं चान्तश्च परार्धश्चैता मे अग्न इष्टका धेनवः सन्त्वमुत्रामुष्मिंल्लोके ॥",
  "iast": "imā me agna iṣṭakā dhenavaḥ santv ekā ca daśa ca daśa ca śataṃ ca śataṃ ca sahasraṃ ca sahasraṃ cāyutaṃ cāyutaṃ ca niyutaṃ ca niyutaṃ ca prayutaṃ cārbudaṃ ca nyarbudaṃ samudraś ca madhyaṃ cāntaś ca parārdhaś caitā me agna iṣṭakā dhenavaḥ santv amutrāmuṣmiṃl loke ||",
  "say": "I-maa MAY AG-na ISH-ta-kaa DHAY-na-vah SANT VAY-kaa cha DA-sha cha DA-sha cha SHA-tam cha SHA-tam cha sa-HA-sram cha sa-HA-sram CHAA-yu-tam CHAA-yu-tam cha NI-yu-tam cha NI-yu-tam cha PRA-yu-tam CHAAR-bu-dam cha NYAR-bu-dam sa-MU-drash cha MA-dhyam CHAAN-tash cha pa-RAAR-dhash CHAI-taa MAY AG-na ISH-ta-kaa DHAY-na-vah SANT va-mu-traa-MUSH-miml LO-kay",
  "words": [
   [
    "imāḥ",
    "these"
   ],
   [
    "me",
    "for me"
   ],
   [
    "agne",
    "O Agni"
   ],
   [
    "iṣṭakāḥ",
    "bricks (of the fire altar)"
   ],
   [
    "dhenavaḥ",
    "milk cows"
   ],
   [
    "santu",
    "may they be"
   ],
   [
    "ekā",
    "one"
   ],
   [
    "ca",
    "and"
   ],
   [
    "daśa",
    "ten"
   ],
   [
    "śataṃ",
    "a hundred"
   ],
   [
    "sahasraṃ",
    "a thousand"
   ],
   [
    "ayutaṃ",
    "ten thousand"
   ],
   [
    "niyutaṃ",
    "a hundred thousand"
   ],
   [
    "prayutaṃ",
    "a million"
   ],
   [
    "arbudaṃ",
    "ten million"
   ],
   [
    "nyarbudaṃ",
    "a hundred million"
   ],
   [
    "samudraḥ",
    "a billion (literally: ocean)"
   ],
   [
    "madhyaṃ",
    "ten billion (literally: middle)"
   ],
   [
    "antaḥ",
    "a hundred billion (literally: end)"
   ],
   [
    "parārdhaḥ",
    "a trillion (literally: the far half)"
   ],
   [
    "etāḥ",
    "these"
   ],
   [
    "amutra amuṣmin loke",
    "there, in that (other) world"
   ]
  ],
  "meaning": "O Agni, may these bricks be milk cows for me: one and ten, ten and a hundred, a hundred and a thousand, a thousand and ten thousand, ten thousand and a hundred thousand, a hundred thousand and a million, ten million, a hundred million, an ocean, a middle, an end, a parārdha. O Agni, may these bricks be milk cows for me, there in that world.",
  "plain": "Thousands of years ago, priests building a fire altar chanted a ladder of number names where each step is ten times bigger, all the way up to a million million.",
  "math": "Names for 1, 10, 100, ... up to 10^12 (parārdha), each ten times the one before",
  "source": "Śukla Yajurveda, Vājasaneyi Saṃhitā (Mādhyandina) 17.2; a parallel list is in Taittirīya Saṃhitā 4.4.11. Vedic mantra collection, roughly early first millennium BCE (dates approximate).",
  "note": "This is a ritual prayer for the fire altar, not a lesson in arithmetic. The text gives the names in order; the values as powers of ten (samudra = 10^9 and so on) follow the standard scholarly reading (Datta and Singh). Number names above a thousand differ between later texts (compare Āryabhaṭa and Bhāskara). Accents omitted here; TITUS has the accented text. Some editions read \"nyarbudaṃ ca samudraś ca\".",
  "related": [],
  "refs": [
   [
    "TITUS: Vājasaneyi Saṃhitā (Mādhyandina), book 17",
    "https://titus.uni-frankfurt.de/texte/etcs/ind/aind/ved/yvw/vs/vs017.htm"
   ],
   [
    "Some Sanskrit Verses in Ancient Math (BPRIM, 2026)",
    "https://www.bprim.org/sites/default/files/Some%20Sanskrit%20Verses%20in%20Ancient%20Math%20BP%202ndFeb26.pdf"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "sulba-diagonal-rule",
  "group": "vedic",
  "title": "The diagonal rule (the \"Pythagorean\" theorem)",
  "kind": "sutra",
  "meter": "",
  "deva": "दीर्घचतुरस्रस्याक्ष्णया रज्जुः पार्श्वमानी तिर्यङ्मानी च यत्पृथग्भूते कुरुतस्तदुभयं करोति ॥",
  "iast": "dīrghacaturasrasyākṣṇayā rajjuḥ pārśvamānī tiryaṅmānī ca yat pṛthagbhūte kurutas tad ubhayaṃ karoti ||",
  "say": "deer-gha-cha-tu-ra-sras-YAAK-shna-yaa RAJ-juh paar-shva-MAA-nee tir-yang-MAA-nee cha YAT pri-thag-BHOO-tay KU-ru-tas TAD U-bha-yam ka-RO-ti",
  "words": [
   [
    "dīrghacaturasrasya",
    "of a rectangle (literally: a long four-cornered figure)"
   ],
   [
    "akṣṇayā rajjuḥ",
    "the diagonal cord"
   ],
   [
    "pārśvamānī",
    "the cord measuring the long side"
   ],
   [
    "tiryaṅmānī",
    "the cord measuring the short side"
   ],
   [
    "ca",
    "and"
   ],
   [
    "yat",
    "what (area)"
   ],
   [
    "pṛthagbhūte",
    "separately"
   ],
   [
    "kurutaḥ",
    "the two produce"
   ],
   [
    "tat",
    "that"
   ],
   [
    "ubhayaṃ",
    "both together"
   ],
   [
    "karoti",
    "it (the diagonal) produces"
   ]
  ],
  "meaning": "The diagonal cord of a rectangle produces both (areas) which the cords along the long side and the short side produce separately.",
  "plain": "Make a square on each side of a rectangle and one on its diagonal: the two side squares together cover exactly as much ground as the diagonal square, so 3 and 4 give a diagonal of 5.",
  "math": "a² + b² = c² for the sides a, b and diagonal c of a rectangle (right triangle)",
  "source": "Baudhāyana Śulbasūtra 1.12 (numbering of Sen and Bag 1983, used by Plofker) = 1.48 (Thibaut's numbering). Same wording in Āpastamba Śulbasūtra 1.4. Baudhāyana is dated roughly 800 to 500 BCE, with wide uncertainty.",
  "note": "A rule for laying out brick fire altars with cords, stated without proof. The next sūtra lists triples such as 3, 4, 5 and 5, 12, 13. Babylonian tablets (for example Plimpton 322, around 1800 BCE) show such triples were known even earlier, and the name \"Pythagorean\" is a later Greek attribution; this is one of several independent early statements. Spelling varies between caturasra and caturaśra.",
  "related": [],
  "refs": [
   [
    "Wikipedia: Baudhayana sutras (text of the diagonal rule, Thibaut translation)",
    "https://en.wikipedia.org/wiki/Baudhayana_sutras"
   ],
   [
    "Wikipedia: Shulba Sutras (Sen and Bag / Plofker numbering 1.12, 2.12; dating)",
    "https://en.wikipedia.org/wiki/Shulba_Sutras"
   ],
   [
    "GRETIL: Āpastamba Śulbasūtra with commentary (1.4 to 1.6)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_ApastambazulbasUtra.txt"
   ],
   [
    "arXiv 2406.10147: From Concrete to Abstract in Indian Mathematics (cites BŚ 1.48 in Thibaut numbering)",
    "https://arxiv.org/pdf/2406.10147"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "sulba-root-two",
  "group": "vedic",
  "title": "How long is a square's diagonal? (√2)",
  "kind": "sutra",
  "meter": "",
  "deva": "समस्य द्विकरणी ।\nप्रमाणं तृतीयेन वर्धयेत्तच्चतुर्थेनात्मचतुस्त्रिंशोनेन सविशेषः ॥",
  "iast": "samasya dvikaraṇī |\npramāṇaṃ tṛtīyena vardhayet tac caturthenātmacatustriṃśonena saviśeṣaḥ ||",
  "say": "sa-MAS-ya dvi-KA-ra-nee | pra-MAA-nam tri-tee-YAY-na VAR-dha-yayt TACH cha-tur-thay-naat-ma-cha-tus-trim-sho-NAY-na sa-vi-SHAY-shah",
  "words": [
   [
    "samasya",
    "of a square"
   ],
   [
    "dvikaraṇī",
    "\"the doubler\", the diagonal (it makes a square of double area)"
   ],
   [
    "pramāṇaṃ",
    "the measure (the side)"
   ],
   [
    "tṛtīyena",
    "by a third (of itself)"
   ],
   [
    "vardhayet",
    "one should increase"
   ],
   [
    "tat",
    "that (third)"
   ],
   [
    "caturthena",
    "by its fourth"
   ],
   [
    "ātmacatustriṃśonena",
    "less its own thirty-fourth part"
   ],
   [
    "saviśeṣaḥ",
    "(this is) the saviśeṣa, \"with a little extra\", a slightly-too-long value"
   ]
  ],
  "meaning": "(The diagonal) of a square is the doubler. Increase the measure by its third, and this (third) by its own fourth less its thirty-fourth part: this is the saviśeṣa (the value with a small excess).",
  "plain": "If a square has side 1, its diagonal is a little more than 1.414; the old rule says 1 + 1/3 + 1/12 - 1/408, which is 1.414216, off by only about 2 millionths.",
  "math": "√2 ≈ 1 + 1/3 + 1/(3·4) - 1/(3·4·34) = 577/408 ≈ 1.414216 (true value 1.414214)",
  "source": "Baudhāyana Śulbasūtra 1.9 and 2.12 (Sen and Bag / Plofker numbering) = 1.61 to 1.62 (Thibaut's numbering); identical wording in Āpastamba Śulbasūtra 1.5 to 1.6. Roughly 800 to 500 BCE, uncertain.",
  "note": "The text gives the rule, not the method that produced it; how it was found is reconstructed by historians. The word saviśeṣa signals that the value is slightly too large, so the authors seem to have known it was approximate; it does not show they knew √2 is irrational. The quoted Sanskrit is the Āpastamba text from GRETIL; translations follow Thibaut and Datta.",
  "related": [],
  "refs": [
   [
    "Wikipedia: Baudhayana sutras (text of the diagonal rule, Thibaut translation)",
    "https://en.wikipedia.org/wiki/Baudhayana_sutras"
   ],
   [
    "Wikipedia: Shulba Sutras (Sen and Bag / Plofker numbering 1.12, 2.12; dating)",
    "https://en.wikipedia.org/wiki/Shulba_Sutras"
   ],
   [
    "GRETIL: Āpastamba Śulbasūtra with commentary (1.4 to 1.6)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_ApastambazulbasUtra.txt"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "purnam-adah",
  "group": "vedic",
  "title": "Whole from whole (pūrṇam adaḥ)",
  "kind": "mantra",
  "meter": "anuṣṭubh",
  "deva": "पूर्णमदः पूर्णमिदं पूर्णात्पूर्णमुदच्यते ।\nपूर्णस्य पूर्णमादाय पूर्णमेवावशिष्यते ॥",
  "iast": "pūrṇam adaḥ pūrṇam idaṃ pūrṇāt pūrṇam udacyate |\npūrṇasya pūrṇam ādāya pūrṇam evāvaśiṣyate ||",
  "say": "POOR-nam A-dah POOR-nam I-dam POOR-naat POOR-nam u-DA-chya-tay | poor-NAS-ya POOR-nam aa-DAA-ya POOR-nam ay-vaa-va-SHISH-ya-tay",
  "words": [
   [
    "pūrṇam",
    "full, whole, complete"
   ],
   [
    "adaḥ",
    "that (the unseen)"
   ],
   [
    "idaṃ",
    "this (the seen world)"
   ],
   [
    "pūrṇāt",
    "from the whole"
   ],
   [
    "udacyate",
    "rises, comes forth"
   ],
   [
    "pūrṇasya",
    "of the whole"
   ],
   [
    "ādāya",
    "taking away"
   ],
   [
    "eva",
    "still, only"
   ],
   [
    "avaśiṣyate",
    "remains"
   ]
  ],
  "meaning": "That is whole, this is whole; from the whole the whole comes forth. Taking the whole from the whole, the whole alone remains.",
  "plain": "A very old prayer about wholeness: you can take everything out of the whole and it is still whole, which reminds many people today of infinity, even though it was not written as math.",
  "math": "Often compared today with infinity (∞ - ∞), though in modern arithmetic ∞ - ∞ is undefined",
  "source": "Bṛhadāraṇyaka Upaniṣad 5.1.1 (Kāṇva); also recited as the opening invocation (śānti-pāṭha) of the Īśa Upaniṣad. Probably 7th to 6th century BCE (approximate).",
  "note": "This is philosophy, not a mathematics text. Śaṅkara's commentary explains it as about brahman, the infinite reality, and the world. Reading it as a statement about the number infinity is a modern interpretation. Interestingly, the same passage continues \"khaṃ brahma\" (brahman is space), and kha, \"empty space\", later became a common word for zero.",
  "related": [],
  "refs": [
   [
    "GRETIL: Bṛhadāraṇyaka Upaniṣad (Kāṇva) with Śaṅkara's commentary, 5.1.1",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_bRhadAraNyakopaniSadkANva-recension-comm.txt"
   ],
   [
    "GRETIL: Īśopaniṣad (Kāṇva) with commentary (invocation)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_IzopaniSad-or-IzAvAsyopaniSadkANva-recension-comm.txt"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "pingala-powers-of-two",
  "group": "classical",
  "title": "Piṅgala's shortcut for powers of two",
  "kind": "sutra",
  "meter": "",
  "deva": "द्विरर्धे । रूपे शून्यम् । द्विः शून्ये । तावदर्धे तद्गुणितम् ॥",
  "iast": "dvir ardhe | rūpe śūnyam | dviḥ śūnye | tāvad ardhe tadguṇitam ||",
  "say": "DVIR AR-dhay ROO-pay SHOON-yam DVIH SHOON-yay TAA-vad AR-dhay tad-GU-ni-tam",
  "words": [
   [
    "dviḥ",
    "two (write the mark \"2\")"
   ],
   [
    "ardhe",
    "when (the number) is halved"
   ],
   [
    "rūpe",
    "when one is taken away"
   ],
   [
    "śūnyam",
    "an empty mark, a zero"
   ],
   [
    "dviḥ",
    "twice, double"
   ],
   [
    "śūnye",
    "at the empty mark"
   ],
   [
    "tāvat",
    "that much"
   ],
   [
    "ardhe",
    "at the halving mark"
   ],
   [
    "tadguṇitam",
    "multiplied by itself"
   ]
  ],
  "meaning": "(If the number can be halved, halve it and write) two. (If not,) take away one and write a zero. (Then, working back from the end, starting from one:) at a zero, double; at a halving mark, multiply the amount by itself.",
  "plain": "To count all the long and short beat patterns in a 6-syllable line, Piṅgala halves and subtracts down to nothing, then doubles and squares back up: 1, 2, 4, 8, 64, so there are 64 patterns.",
  "math": "2^n by repeated halving and squaring (the \"square and multiply\" method); e.g. 2^6 = 64",
  "source": "Piṅgala, Chandaḥśāstra (Chandaḥsūtra) 8.28 to 8.31 in the numbering used by A. Kulkarni. Commonly dated to the last centuries BCE, uncertain. Explained by the commentator Halāyudha (Mṛtasañjīvanī, usually dated to the 10th century CE).",
  "note": "These are terse prosody rules for counting Sanskrit meters, and they only make sense with a commentary. Sūtra numbering and readings vary between editions. Whether śūnya here is already the numeral zero or just a written marker is debated. Popular claims that Piṅgala \"invented binary numbers\" overstate it: his listing of long and short syllable patterns is analogous to binary counting. The number triangle (meru-prastāra, now called Pascal's triangle) is described in Halāyudha's later commentary, not in these sūtras.",
  "related": [],
  "refs": [
   [
    "A. Kulkarni, Recursion and Combinatorial Mathematics in Chandaśāstra (arXiv math/0703658)",
    "https://arxiv.org/pdf/math/0703658"
   ],
   [
    "INDOLOGY list, July 2022: Sunya (Piṅgala 8.28 to 8.31 as transcribed by A. Kulkarni)",
    "https://list.indology.info/pipermail/indology/2022-July/056544.html"
   ]
  ],
  "confidence": "medium"
 },
 {
  "id": "aryabhata-place-value",
  "group": "classical",
  "title": "Each place is ten times the last",
  "kind": "verse",
  "meter": "āryā",
  "deva": "एकं च दश च शतं च सहस्रं त्वयुतनियुते तथा प्रयुतम् ।\nकोट्यर्बुदं च वृन्दं स्थानात्स्थानं दशगुणं स्यात् ॥",
  "iast": "ekaṃ ca daśa ca śataṃ ca sahasraṃ tv ayutaniyute tathā prayutam |\nkoṭyarbudaṃ ca vṛndaṃ sthānāt sthānaṃ daśaguṇaṃ syāt ||",
  "say": "AY-kam cha DA-sha cha SHA-tam cha sa-HA-sram tva-yu-ta-NI-yu-tay TA-thaa PRA-yu-tam | ko-TYAR-bu-dam cha VRIN-dam STHAA-naat STHAA-nam da-SHA-gu-nam SYAAT",
  "words": [
   [
    "ekaṃ",
    "one"
   ],
   [
    "daśa",
    "ten"
   ],
   [
    "śataṃ",
    "a hundred"
   ],
   [
    "sahasraṃ",
    "a thousand"
   ],
   [
    "ayutaniyute",
    "ten thousand and a hundred thousand"
   ],
   [
    "tathā",
    "likewise"
   ],
   [
    "prayutam",
    "a million"
   ],
   [
    "koṭyarbudaṃ",
    "ten million and a hundred million"
   ],
   [
    "vṛndaṃ",
    "a billion (10^9)"
   ],
   [
    "sthānāt sthānaṃ",
    "from place to place"
   ],
   [
    "daśaguṇaṃ",
    "ten times"
   ],
   [
    "syāt",
    "is"
   ]
  ],
  "meaning": "One, ten, a hundred, a thousand, ten thousand, a hundred thousand, a million, ten million, a hundred million and a billion: from place to place, each is ten times (the previous).",
  "plain": "Āryabhaṭa names the places in a number, ones, tens, hundreds and so on, and says each place is worth ten times the one to its right, which is exactly how we write numbers today.",
  "math": "Decimal place value: each place is worth 10 times the place before (1 to 10^9)",
  "source": "Āryabhaṭa, Āryabhaṭīya, Gaṇitapāda 2; composed 499 CE (Kusumapura).",
  "note": "The GRETIL e-text (from Shukla's edition, entered without sandhi) omits \"ca\" after ekaṃ and \"tu\" before ayuta; the fuller reading here is the one usually printed and is needed for the āryā meter. The verse names the places; it does not itself describe the written zero.",
  "related": [],
  "refs": [
   [
    "GRETIL: Āryabhaṭīya (K. S. Shukla ed., INSA 1976)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_AryabhaTa-AryabhaTIya.txt"
   ],
   [
    "Some Sanskrit Verses in Ancient Math (BPRIM, 2026)",
    "https://www.bprim.org/sites/default/files/Some%20Sanskrit%20Verses%20in%20Ancient%20Math%20BP%202ndFeb26.pdf"
   ]
  ],
  "confidence": "medium"
 },
 {
  "id": "aryabhata-pi",
  "group": "classical",
  "title": "Āryabhaṭa's value of π",
  "kind": "verse",
  "meter": "āryā",
  "deva": "चतुरधिकं शतमष्टगुणं द्वाषष्टिस्तथा सहस्राणाम् ।\nअयुतद्वयविष्कम्भस्यासन्नो वृत्तपरिणाहः ॥",
  "iast": "caturadhikaṃ śatam aṣṭaguṇaṃ dvāṣaṣṭis tathā sahasrāṇām |\nayutadvayaviṣkambhasyāsanno vṛttapariṇāhaḥ ||",
  "say": "cha-tu-RA-dhi-kam SHA-tam ash-TA-gu-nam dvaa-SHASH-tis TA-thaa sa-ha-SRAA-naam | a-yu-ta-dva-ya-vish-kam-bhas-yaa-SAN-no vrit-ta-pa-ri-NAA-hah",
  "words": [
   [
    "caturadhikaṃ",
    "increased by four"
   ],
   [
    "śatam",
    "a hundred"
   ],
   [
    "aṣṭaguṇaṃ",
    "multiplied by eight"
   ],
   [
    "dvāṣaṣṭiḥ",
    "sixty-two"
   ],
   [
    "tathā",
    "and also"
   ],
   [
    "sahasrāṇām",
    "thousands"
   ],
   [
    "ayutadvaya",
    "two ayutas, 20,000"
   ],
   [
    "viṣkambhasya",
    "of a diameter"
   ],
   [
    "āsannaḥ",
    "approximate, near"
   ],
   [
    "vṛttapariṇāhaḥ",
    "circumference of the circle"
   ]
  ],
  "meaning": "One hundred plus four, multiplied by eight, and sixty-two thousand added: this is the approximate circumference of a circle whose diameter is twenty thousand.",
  "plain": "(100 + 4) × 8 + 62,000 = 62,832, and a circle 20,000 units across goes about 62,832 units around, so π is about 3.1416.",
  "math": "π ≈ 62832 / 20000 = 3.1416",
  "source": "Āryabhaṭa, Āryabhaṭīya, Gaṇitapāda 10; 499 CE. Quoted in the Kriyākramakarī on Līlāvatī 199.",
  "note": "The word āsanna (\"near\") shows Āryabhaṭa knew this was an approximation. Some modern writers suggest it hints that π is irrational; that is a modern interpretation, not something the text proves. The Kriyākramakarī commentary explains āsanna in a similar way.",
  "related": [],
  "refs": [
   [
    "GRETIL: Āryabhaṭīya (K. S. Shukla ed., INSA 1976)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_AryabhaTa-AryabhaTIya.txt"
   ],
   [
    "Wikipedia: Aryabhata (Gaṇitapāda 10 text and translation)",
    "https://en.wikipedia.org/wiki/Aryabhata"
   ],
   [
    "Līlāvatī with Kriyākramakarī, ed. K. V. Sarma, VVRI 1975 (archive.org scan)",
    "https://archive.org/details/zNEE_lilavati-of-bhaskaracharya-with-kriya-karmakari-of-shankar-and-narayan-by-k.-v.-"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "brahmagupta-zero-sums",
  "group": "classical",
  "title": "Adding with fortunes, debts and zero",
  "kind": "verse",
  "meter": "āryā",
  "deva": "धनयोर्धनमृणमृणयोर्धनर्णयोरन्तरं समैक्यं खम् ।\nऋणमैक्यं च धनमृणधनशून्ययोः शून्ययोः शून्यम् ॥",
  "iast": "dhanayor dhanam ṛṇam ṛṇayor dhanarṇayor antaraṃ samaikyaṃ kham |\nṛṇam aikyaṃ ca dhanam ṛṇadhanaśūnyayoḥ śūnyayoḥ śūnyam ||",
  "say": "DHA-na-yor DHA-nam RI-nam RI-na-yor dha-NAR-na-yor AN-ta-ram sa-MAI-kyam KHAM | RI-nam AI-kyam cha DHA-nam ri-na-dha-na-SHOON-ya-yoh SHOON-ya-yoh SHOON-yam",
  "words": [
   [
    "dhanayoḥ",
    "of two fortunes (positives)"
   ],
   [
    "dhanam",
    "a fortune"
   ],
   [
    "ṛṇam",
    "a debt (negative)"
   ],
   [
    "ṛṇayoḥ",
    "of two debts"
   ],
   [
    "dhanarṇayoḥ",
    "of a fortune and a debt"
   ],
   [
    "antaraṃ",
    "the difference"
   ],
   [
    "samaikyaṃ",
    "the sum of equal (fortune and debt)"
   ],
   [
    "kham",
    "zero (literally: empty space)"
   ],
   [
    "ṛṇam aikyaṃ ca dhanam",
    "the sum is a debt, and a fortune (respectively)"
   ],
   [
    "ṛṇadhanaśūnyayoḥ",
    "of a debt and zero, of a fortune and zero"
   ],
   [
    "śūnyayoḥ",
    "of two zeros"
   ],
   [
    "śūnyam",
    "zero"
   ]
  ],
  "meaning": "(The sum) of two positives is positive, of two negatives is negative; of a positive and a negative it is their difference, and if they are equal, zero. The sum of a negative and zero is negative, of a positive and zero positive, and of two zeros zero.",
  "plain": "Think of money: two gifts make a bigger gift, two debts make a bigger debt, a gift and a debt cancel down to the difference, and adding nothing changes nothing.",
  "math": "Rules for adding positive and negative numbers and zero: (+)+(+)=+, (-)+(-)=-, a+(-a)=0, a+0=a, 0+0=0",
  "source": "Brahmagupta, Brāhmasphuṭasiddhānta 18.30 (chapter on algebra, kuṭṭaka); 628 CE.",
  "note": "One of the earliest known statements treating zero as a number with its own arithmetic rules. Brahmagupta's words for positive and negative are dhana (wealth) and ṛṇa (debt). In 18.34 to 18.35 he also says zero divided by zero is zero, which modern mathematics does not accept. Text checked in the Dvivedin (GRETIL) and R. S. Sharma editions.",
  "related": [],
  "refs": [
   [
    "GRETIL: Brāhmasphuṭasiddhānta (S. Dvivedin ed., 1902)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_brahmagupta-brAhmasphuTasiddhAnta.txt"
   ],
   [
    "Brāhmasphuṭasiddhānta, ed. R. S. Sharma, 1966, vol. 4 (archive.org scan)",
    "https://archive.org/details/wg1258"
   ],
   [
    "Wikipedia: Brāhmasphuṭasiddhānta (rules for zero and negatives)",
    "https://en.wikipedia.org/wiki/Br%C4%81hmasphu%E1%B9%ADasiddh%C4%81nta"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "brahmagupta-sign-products",
  "group": "classical",
  "title": "A debt times a debt is a fortune",
  "kind": "verse",
  "meter": "āryā",
  "deva": "ऋणमृणधनयोर्घातो धनमृणयोर्धनवधो धनं भवति ।\nशून्यर्णयोः खधनयोः खशून्ययोर्वा वधः शून्यम् ॥",
  "iast": "ṛṇam ṛṇadhanayor ghāto dhanam ṛṇayor dhanavadho dhanaṃ bhavati |\nśūnyarṇayoḥ khadhanayoḥ khaśūnyayor vā vadhaḥ śūnyam ||",
  "say": "RI-nam ri-na-DHA-na-yor GHAA-to DHA-nam RI-na-yor dha-NA-va-dho DHA-nam BHA-va-ti | shoon-YAR-na-yoh kha-DHA-na-yoh kha-SHOON-ya-yor VAA VA-dhah SHOON-yam",
  "words": [
   [
    "ṛṇam",
    "a debt (negative)"
   ],
   [
    "ṛṇadhanayoḥ",
    "of a debt and a fortune"
   ],
   [
    "ghātaḥ",
    "the product"
   ],
   [
    "dhanam",
    "a fortune (positive)"
   ],
   [
    "ṛṇayoḥ",
    "of two debts"
   ],
   [
    "dhanavadhaḥ",
    "the product of fortunes"
   ],
   [
    "bhavati",
    "is"
   ],
   [
    "śūnyarṇayoḥ",
    "of zero and a debt"
   ],
   [
    "khadhanayoḥ",
    "of zero and a fortune"
   ],
   [
    "khaśūnyayoḥ",
    "of zero and zero"
   ],
   [
    "vā",
    "or"
   ],
   [
    "vadhaḥ",
    "the product"
   ],
   [
    "śūnyam",
    "zero"
   ]
  ],
  "meaning": "The product of a negative and a positive is negative; of two negatives, positive; the product of positives is positive. The product of zero and a negative, of zero and a positive, or of two zeros, is zero.",
  "plain": "Multiplying a positive by a negative gives a negative, two negatives make a positive, and anything times zero is zero, written down about 1,400 years ago.",
  "math": "(-)×(+) = -, (-)×(-) = +, (+)×(+) = +, a×0 = 0",
  "source": "Brahmagupta, Brāhmasphuṭasiddhānta 18.33; 628 CE.",
  "note": "Stated as rules without proof. Text checked in the Dvivedin (GRETIL) and R. S. Sharma editions, which agree.",
  "related": [],
  "refs": [
   [
    "GRETIL: Brāhmasphuṭasiddhānta (S. Dvivedin ed., 1902)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_brahmagupta-brAhmasphuTasiddhAnta.txt"
   ],
   [
    "Brāhmasphuṭasiddhānta, ed. R. S. Sharma, 1966, vol. 4 (archive.org scan)",
    "https://archive.org/details/wg1258"
   ],
   [
    "Wikipedia: Brāhmasphuṭasiddhānta (rules for zero and negatives)",
    "https://en.wikipedia.org/wiki/Br%C4%81hmasphu%E1%B9%ADasiddh%C4%81nta"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "varahamihira-saka-427",
  "group": "classical",
  "title": "Numbers written as words: Śaka 427",
  "kind": "verse",
  "meter": "āryā",
  "deva": "सप्ताश्विवेदसंख्यं शककालमपास्य चैत्रशुक्लादौ ।",
  "iast": "saptāśvivedasaṃkhyaṃ śakakālam apāsya caitraśuklādau |",
  "say": "sap-taash-vi-vay-da-SAM-khyam sha-ka-KAA-lam a-PAAS-ya chai-tra-shuk-LAA-dau",
  "words": [
   [
    "sapta",
    "seven: 7"
   ],
   [
    "aśvi",
    "the Aśvin twins: 2"
   ],
   [
    "veda",
    "the Vedas: 4"
   ],
   [
    "saṃkhyaṃ",
    "numbering"
   ],
   [
    "śakakālam",
    "the Śaka era (years)"
   ],
   [
    "apāsya",
    "having subtracted"
   ],
   [
    "caitraśuklādau",
    "at the beginning of the bright half of the month Caitra"
   ]
  ],
  "meaning": "Subtract (from the given year) the Śaka year numbered seven, twins (Aśvins), Vedas, that is 427, at the beginning of the bright fortnight of Caitra.",
  "plain": "Instead of digits, the poet used words: \"seven\", \"the twins\" (2) and \"the Vedas\" (4); reading them right to left gives 427, a year that is 505 CE.",
  "math": "Bhūta-saṃkhyā (object-number words) read right to left: 7, 2, 4 → 427",
  "source": "Varāhamihira, Pañcasiddhāntikā 1.8, first half (Romaka method); epoch Śaka 427 = 505 CE; work of the 6th century CE.",
  "note": "Only the first half of the verse is given. The second half names the weekday of the epoch, and the editions disagree on that word (Fleet and Neugebauer and Pingree favour Tuesday; other manuscripts read Wednesday or Monday). The right-to-left order (\"aṅkānāṃ vāmato gatiḥ\") is the standard rule for word numerals.",
  "related": [],
  "refs": [
   [
    "Pañcasiddhāntikā, ed. T. S. Kuppanna Sastry and K. V. Sarma (archive.org scan)",
    "https://archive.org/details/panca-siddhantika-varahamihira-t.-s.-kuppanna-sastry-k.-v.-sarma"
   ],
   [
    "Neugebauer and Pingree, The Pañcasiddhāntikā of Varāhamihira, vol. 1, 1970 (archive.org scan)",
    "https://archive.org/details/pancasiddhantika1_1970"
   ],
   [
    "Indian Antiquary vol. 19 (1890), p. 54: Fleet on the epoch verse and its variant readings",
    "https://www.jainqq.org/pagetext/Indian_Antiquary_Vol_19/032511/54"
   ],
   [
    "Wikipedia: Pancha-siddhantika (Śaka 427 = 505 CE)",
    "https://en.wikipedia.org/wiki/Pancha-siddhantika"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "mahavira-ganita-everywhere",
  "group": "classical",
  "title": "Nothing exists without mathematics",
  "kind": "verse",
  "meter": "anuṣṭubh",
  "deva": "बहुभिर्विप्रलापैः किं त्रैलोक्ये सचराचरे ।\nयत्किंचिद्वस्तु तत्सर्वं गणितेन विना न हि ॥",
  "iast": "bahubhir vipralāpaiḥ kiṃ trailokye sacarācare |\nyat kiṃcid vastu tat sarvaṃ gaṇitena vinā na hi ||",
  "say": "BA-hu-bhir vi-pra-LAA-paih KIM trai-LO-kyay sa-cha-RAA-cha-ray | YAT KIM-chid VAS-tu TAT SAR-vam ga-ni-TAY-na VI-naa na hi",
  "words": [
   [
    "bahubhiḥ",
    "with many"
   ],
   [
    "vipralāpaiḥ",
    "idle words"
   ],
   [
    "kiṃ",
    "what is the use"
   ],
   [
    "trailokye",
    "in the three worlds"
   ],
   [
    "sacarācare",
    "with all moving and unmoving things"
   ],
   [
    "yat kiṃcit",
    "whatever"
   ],
   [
    "vastu",
    "thing"
   ],
   [
    "tat sarvaṃ",
    "all of that"
   ],
   [
    "gaṇitena",
    "mathematics, calculation"
   ],
   [
    "vinā",
    "without"
   ],
   [
    "na hi",
    "surely is not"
   ]
  ],
  "meaning": "What is the use of saying much? Whatever there is in the three worlds, with all their moving and unmoving beings, none of it exists apart from mathematics.",
  "plain": "A Jain teacher said: why argue? Everything in the whole world, moving or still, needs numbers and measuring to be understood.",
  "math": "Praise of gaṇita (mathematics) as present in everything",
  "source": "Mahāvīra (Mahāvīrācārya), Gaṇitasārasaṃgraha 1.16 (Saṃjñādhikāra); c. 850 CE, at the court of the Rāṣṭrakūṭa king Amoghavarṣa.",
  "note": "A Jain mathematical textbook, not a Vedic one. Rangacharya's 1912 translation renders gaṇita here as \"measurement\". The online text is unproofread OCR (it prints \"trailokaye\"); the reading trailokye is standard.",
  "related": [],
  "refs": [
   [
    "Wisdom Library: Gaṇitasārasaṃgraha, ch. 1 Sanskrit (Rangacharya ed., 1912)",
    "https://www.wisdomlib.org/hinduism/book/ganita-sara-sangraha-by-mahavira-acharya/d/doc1603027.html"
   ],
   [
    "Wisdom Library: Gaṇitasārasaṃgraha, ch. 1 English (Rangacharya tr., 1912)",
    "https://www.wisdomlib.org/hinduism/book/ganita-sara-sangraha-by-mahavira-acharya/d/doc1603018.html"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "lilavati-squares",
  "group": "classical",
  "title": "Bhāskara's squaring shortcuts",
  "kind": "verse",
  "meter": "upajāti (indravajrā family)",
  "deva": "खण्डद्वयस्याभिहतिर्द्विनिघ्नी तत्खण्डवर्गैक्ययुता कृतिर्वा ।\nइष्टोनयुग्राशिवधः कृतिः स्यादिष्टस्य वर्गेण समन्वितो वा ॥",
  "iast": "khaṇḍadvayasyābhihatir dvinighnī tatkhaṇḍavargaikyayutā kṛtir vā |\niṣṭonayugrāśivadhaḥ kṛtiḥ syād iṣṭasya vargeṇa samanvito vā ||",
  "say": "khan-da-dva-yas-yaa-BHI-ha-tir dvi-NIGH-nee tat-khan-da-var-gai-KYA-yu-taa KRI-tir VAA | ish-to-na-yu-graa-SHI-va-dhah KRI-tih SYAAD ish-TAS-ya var-GAY-na sa-MAN-vi-to VAA",
  "words": [
   [
    "khaṇḍadvayasya",
    "of two parts (of the number)"
   ],
   [
    "abhihatiḥ",
    "the product"
   ],
   [
    "dvinighnī",
    "multiplied by two"
   ],
   [
    "tatkhaṇḍavargaikyayutā",
    "added to the sum of the squares of those parts"
   ],
   [
    "kṛtiḥ",
    "the square"
   ],
   [
    "vā",
    "or"
   ],
   [
    "iṣṭa",
    "a chosen amount"
   ],
   [
    "ūnayugrāśivadhaḥ",
    "the product of the number decreased and increased (by it)"
   ],
   [
    "syāt",
    "is"
   ],
   [
    "iṣṭasya vargeṇa",
    "by the square of the chosen amount"
   ],
   [
    "samanvitaḥ",
    "increased"
   ]
  ],
  "meaning": "Or: the product of two parts (of a number), doubled and added to the sum of the squares of the parts, is the square. Or: the product of the number decreased and increased by any chosen amount, plus the square of that chosen amount, is the square.",
  "plain": "To square 297, Bhāskara picks 3: 294 × 300 = 88,200, then add 3 × 3 = 9 to get 88,209, which is much easier than multiplying 297 by 297.",
  "math": "(a + b)² = 2ab + a² + b²; n² = (n - d)(n + d) + d², e.g. 297² = 294 × 300 + 9 = 88209",
  "source": "Bhāskara II, Līlāvatī 20 (squaring, vargaparikarma); c. 1150 CE. The 297 example is in Bhāskara's own prose comment.",
  "note": "The second rule is the same algebraic identity that makes Tirtha's Yāvadūnam squaring work (97² = 94 × 100 + 9 = 9409), so the connection is mathematical, not a source for the 1965 sūtra. K. V. Sarma's edition inserts an extra half-verse (khaṇḍadvayasyābhihatiś caturghnī ...) that other editions lack. The previous verse, Līlāvatī 19, defines the square: samadvighātaḥ kṛtiḥ, \"the product of two equal numbers is the square\".",
  "related": [
   "s10"
  ],
  "refs": [
   [
    "GRETIL: Bhāskara, Līlāvatī (Āpaṭe 1937 and K. V. Sarma 1975 eds.)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_bhAskara-lIlAvatI.txt"
   ],
   [
    "Līlāvatī with Kriyākramakarī, ed. K. V. Sarma, VVRI 1975 (archive.org scan)",
    "https://archive.org/details/zNEE_lilavati-of-bhaskaracharya-with-kriya-karmakari-of-shankar-and-narayan-by-k.-v.-"
   ],
   [
    "Līlāvatī with Tattvaprakāśikā, ed. L. Jha (Chowkhamba) (archive.org scan)",
    "https://archive.org/details/znXO_lilavati-of-bhaskaracharya-with-tattva-prakashika-hindi-commentary-by-pt-shri-la"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "lilavati-bees",
  "group": "classical",
  "title": "The bee puzzle",
  "kind": "verse",
  "meter": "śārdūlavikrīḍita",
  "deva": "पञ्चांशोऽलिकुलात्कदम्बमगमत्त्र्यंशः शिलीन्ध्रं तयो-\nर्विश्लेषस्त्रिगुणो मृगाक्षि कुटजं दोलायमानोऽपरः ।\nकान्ते केतकमालतीपरिमलप्राप्तैककालप्रिया-\nदूताहूत इतस्ततो भ्रमति खे भृङ्गोऽलिसंख्यां वद ॥",
  "iast": "pañcāṃśo 'likulāt kadambam agamat tryaṃśaḥ śilīndhraṃ tayor\nviśleṣas triguṇo mṛgākṣi kuṭajaṃ dolāyamāno 'paraḥ |\nkānte ketakamālatīparimalaprāptaikakālapriyā-\ndūtāhūta itas tato bhramati khe bhṛṅgo 'lisaṃkhyāṃ vada ||",
  "say": "pan-CHAAM-sho LI-ku-laat ka-DAM-bam A-ga-mat TRYAM-shah shi-LEEN-dhram TA-yor | vish-LAY-shas TRI-gu-no mri-GAAK-shi KU-ta-jam do-laa-ya-MAA-no PA-rah | KAAN-tay kay-ta-ka-maa-la-tee-pa-ri-ma-la-praap-tai-ka-kaa-LA-pri-yaa | doo-taa-HOO-ta I-tas TA-to BHRA-ma-ti KHAY BHRING-go li-SAM-khyaam VA-da",
  "words": [
   [
    "pañcāṃśaḥ",
    "a fifth"
   ],
   [
    "alikulāt",
    "of a swarm of bees"
   ],
   [
    "kadambam agamat",
    "went to a kadamba flower"
   ],
   [
    "tryaṃśaḥ",
    "a third"
   ],
   [
    "śilīndhraṃ",
    "(went) to a śilīndhra flower"
   ],
   [
    "tayoḥ viśleṣaḥ",
    "the difference of these two"
   ],
   [
    "triguṇaḥ",
    "three times (that)"
   ],
   [
    "mṛgākṣi",
    "O fawn-eyed girl"
   ],
   [
    "kuṭajaṃ",
    "(went) to a kuṭaja flower"
   ],
   [
    "dolāyamānaḥ",
    "swinging to and fro"
   ],
   [
    "aparaḥ",
    "one other (bee)"
   ],
   [
    "kānte",
    "O lovely one"
   ],
   [
    "ketakamālatīparimala...dūtāhūtaḥ",
    "called at once by the scents of the ketaka and mālatī flowers, like messengers from two sweethearts"
   ],
   [
    "itas tataḥ",
    "here and there"
   ],
   [
    "bhramati khe",
    "wanders in the air"
   ],
   [
    "bhṛṅgaḥ",
    "a bee"
   ],
   [
    "alisaṃkhyāṃ",
    "the number of bees"
   ],
   [
    "vada",
    "tell"
   ]
  ],
  "meaning": "A fifth of a swarm of bees went to a kadamba flower, a third to a śilīndhra flower, and three times their difference, O fawn-eyed girl, to a kuṭaja flower. One more bee, called at the same moment by the fragrance of the ketaka and the mālatī, wanders here and there in the air. Tell me, lovely one, how many bees there are.",
  "plain": "1/5 + 1/3 + 3 × (1/3 - 1/5) of the bees fly off and 1 bee is left over: that makes 3 + 5 + 6 + 1 = 15 bees.",
  "math": "x/5 + x/3 + 3(x/3 - x/5) + 1 = x, so x = 15",
  "source": "Bhāskara II, Līlāvatī 55 (example for iṣṭakarma, the rule of false position) in the Āpaṭe numbering used by GRETIL; c. 1150 CE.",
  "note": "Verse numbering differs between editions. Bhāskara's method is to assume any number, see what it gives, and scale (false position), not to solve an equation the modern way. The other famous bee problem (Līlāvatī 71, answer 72) involves a square root.",
  "related": [],
  "refs": [
   [
    "GRETIL: Bhāskara, Līlāvatī (Āpaṭe 1937 and K. V. Sarma 1975 eds.)",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_bhAskara-lIlAvatI.txt"
   ],
   [
    "Līlāvatī, tr. Patwardhan, Naimpally and Singh (MLBD) (archive.org scan)",
    "https://archive.org/details/lilavatikrishnajishankarapatavardhansomashekharaamritanaimpallyshyamlalsinghmlbd_31_Q"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "madhava-pi-series",
  "group": "codes",
  "title": "Mādhava's endless series for π",
  "kind": "verse",
  "meter": "āryā",
  "deva": "व्यासे वारिधिनिहते रूपहृते व्याससागराभिहते ।\nत्रिशरादिविषमसंख्याभक्तमृणं स्वं पृथक्क्रमात्कुर्यात् ॥",
  "iast": "vyāse vāridhinihate rūpahṛte vyāsasāgarābhihate |\ntriśarādiviṣamasaṃkhyābhaktam ṛṇaṃ svaṃ pṛthak kramāt kuryāt ||",
  "say": "VYAA-say vaa-ri-dhi-NI-ha-tay roo-PA-hri-tay vyaa-sa-saa-ga-raa-BHI-ha-tay | tri-sha-raa-di-vi-sha-ma-sam-khyaa-BHAK-tam RI-nam SVAM PRI-thak KRA-maat KUR-yaat",
  "words": [
   [
    "vyāse",
    "the diameter"
   ],
   [
    "vāridhinihate",
    "multiplied by the oceans (4)"
   ],
   [
    "rūpahṛte",
    "and divided by one"
   ],
   [
    "vyāsasāgarābhihate",
    "the diameter multiplied by the seas (4)"
   ],
   [
    "triśarādiviṣamasaṃkhyābhaktam",
    "divided by the odd numbers three, five (śara, arrows) and so on"
   ],
   [
    "ṛṇaṃ svaṃ",
    "as minus and plus"
   ],
   [
    "pṛthak",
    "separately"
   ],
   [
    "kramāt",
    "in order"
   ],
   [
    "kuryāt",
    "one should apply"
   ]
  ],
  "meaning": "Multiply the diameter by four and divide by one. Then divide four times the diameter by the odd numbers three, five and so on, and subtract and add these in turn, one after another.",
  "plain": "Circumference = 4 × diameter × (1 - 1/3 + 1/5 - 1/7 + ...), a never-ending pattern that creeps closer and closer to π.",
  "math": "C = 4D(1 - 1/3 + 1/5 - 1/7 + ...), i.e. π/4 = 1 - 1/3 + 1/5 - 1/7 + ...",
  "source": "Attributed to Mādhava of Saṅgamagrāma (c. 1340 to 1425, Kerala); quoted in the Kriyākramakarī commentary on Līlāvatī 199 (Śaṅkara Vāriyar and Nārāyaṇa, c. 1534 to 1560) and, per K. V. Sarma, also in Jyeṣṭhadeva's Yuktibhāṣā; the series also appears in Śaṅkara Vāriyar's Yuktidīpikā on the Tantrasaṅgraha.",
  "note": "No work by Mādhava containing this verse survives; it is known through later Kerala commentators who credit him. The same series was published in Europe by Gregory and Leibniz in the 1670s, independently as far as is known. The verse is followed by rules for correction terms that make the slow series much more accurate. The commentary notes \"rūpahṛte\" (divide by one) is there to show the odd numbers start from 1.",
  "related": [],
  "refs": [
   [
    "Līlāvatī with Kriyākramakarī, ed. K. V. Sarma, VVRI 1975 (archive.org scan)",
    "https://archive.org/details/zNEE_lilavati-of-bhaskaracharya-with-kriya-karmakari-of-shankar-and-narayan-by-k.-v.-"
   ],
   [
    "Wikipedia: Kriyakramakari (Mādhava series, citing Plofker)",
    "https://en.wikipedia.org/wiki/Kriyakramakari"
   ],
   [
    "Wikipedia: Madhava of Sangamagrama (dates)",
    "https://en.wikipedia.org/wiki/Madhava_of_Sangamagrama"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "madhava-pi-value",
  "group": "codes",
  "title": "π to eleven decimal places, in words",
  "kind": "verse",
  "meter": "drutavilambita",
  "deva": "विबुधनेत्रगजाहिहुताशनत्रिगुणवेदभवारणबाहवः ।\nनवनिखर्वमिते वृतिविस्तरे परिधिमानमिदं जगदुर्बुधाः ॥",
  "iast": "vibudhanetragajāhihutāśanatriguṇavedabhavāraṇabāhavaḥ |\nnavanikharvamite vṛtivistare paridhimānam idaṃ jagadur budhāḥ ||",
  "say": "vi-bu-dha-nay-tra-ga-jaa-hi-hu-taa-sha-na-tri-gu-na-vay-da-bha-vaa-ra-na-BAA-ha-vah | na-va-ni-khar-VA-mi-tay vri-ti-VIS-ta-ray pa-ri-dhi-MAA-nam I-dam JA-ga-dur BU-dhaah",
  "words": [
   [
    "vibudha",
    "the gods: 33"
   ],
   [
    "netra",
    "eyes: 2"
   ],
   [
    "gaja",
    "elephants (of the directions): 8"
   ],
   [
    "ahi",
    "serpents: 8"
   ],
   [
    "hutāśana",
    "sacred fires: 3"
   ],
   [
    "triguṇa",
    "three qualities: 3, 3 (tri and guṇa)"
   ],
   [
    "veda",
    "Vedas: 4"
   ],
   [
    "bha",
    "lunar mansions: 27"
   ],
   [
    "vāraṇa",
    "elephants: 8"
   ],
   [
    "bāhavaḥ",
    "arms: 2"
   ],
   [
    "navanikharvamite",
    "measuring nine nikharvas (9 × 10^11)"
   ],
   [
    "vṛtivistare",
    "when the diameter of a circle"
   ],
   [
    "paridhimānam",
    "the measure of the circumference"
   ],
   [
    "idaṃ",
    "this"
   ],
   [
    "jagaduḥ",
    "have declared"
   ],
   [
    "budhāḥ",
    "the wise"
   ]
  ],
  "meaning": "When the diameter of a circle is nine nikharvas, the wise have stated the circumference to be: gods (33), eyes (2), elephants (8), serpents (8), fires (3), three (3), qualities (3), Vedas (4), lunar mansions (27), elephants (8), arms (2).",
  "plain": "Read the word-numbers backwards to get 2,827,433,388,233; divide by 900,000,000,000 and you get 3.14159265359, π correct to 11 decimal places.",
  "math": "π ≈ 2827433388233 / (9 × 10^11) ≈ 3.14159265359",
  "source": "Attributed to Mādhavācārya (Mādhava of Saṅgamagrāma, c. 1340 to 1425) in the Kriyākramakarī commentary on Līlāvatī 199 (c. 1534 to 1560), ed. K. V. Sarma 1975.",
  "note": "Uses bhūta-saṃkhyā: words for things with a known count, read right to left, so 33, 2, 8, 8, 3, 3, 3, 4, 27, 8, 2 gives 2,827,433,388,233. The value of nikharva (10^11 here) differs between texts. The commentary presents it as Mādhava's value; no independent work of Mādhava with this verse is known. Text read from the archive.org scan of Sarma's edition (OCR checked by hand).",
  "related": [],
  "refs": [
   [
    "Līlāvatī with Kriyākramakarī, ed. K. V. Sarma, VVRI 1975 (archive.org scan)",
    "https://archive.org/details/zNEE_lilavati-of-bhaskaracharya-with-kriya-karmakari-of-shankar-and-narayan-by-k.-v.-"
   ],
   [
    "Wikipedia: Madhava of Sangamagrama (dates)",
    "https://en.wikipedia.org/wiki/Madhava_of_Sangamagrama"
   ]
  ],
  "confidence": "medium"
 },
 {
  "id": "narayaniyam-katapayadi-date",
  "group": "codes",
  "title": "A date hidden in a blessing (Kaṭapayādi)",
  "kind": "verse",
  "meter": "sragdharā",
  "deva": "स्फीतं लीलावतारैरिदमिह कुरुतामायुरारोग्यसौख्यम् ॥",
  "iast": "sphītaṃ līlāvatārair idam iha kurutām āyurārogyasaukhyam ||",
  "say": "SPHEE-tam lee-laa-va-TAA-rair I-dam I-ha KU-ru-taam aa-yu-raa-ro-gya-SAU-khyam",
  "words": [
   [
    "sphītaṃ",
    "rich, full"
   ],
   [
    "līlāvatāraiḥ",
    "with (stories of) the playful incarnations"
   ],
   [
    "idam",
    "this (hymn)"
   ],
   [
    "iha",
    "here"
   ],
   [
    "kurutām",
    "may it bring about"
   ],
   [
    "āyuḥ",
    "long life"
   ],
   [
    "ārogya",
    "health"
   ],
   [
    "saukhyam",
    "and happiness"
   ]
  ],
  "meaning": "May this (hymn), rich with (the stories of) your playful incarnations, bring long life, health and happiness here.",
  "plain": "The last word, āyurārogyasaukhyam, also hides a number: in the Kaṭapayādi letter code it gives 1712210, the day count since the start of the Kali age on which the poem was finished, in late 1586 CE.",
  "math": "Kaṭapayādi code read right to left: ā=0 yu=1 rā=2 ro=2 gya=1 sau=7 khyam=1 → 1712210",
  "source": "Nārāyaṇa Bhaṭṭa (Melpathur Nārāyaṇa Bhaṭṭatiri), Nārāyaṇīyam 100.11, last quarter-verse; Kerala, completed 1586 CE.",
  "note": "In Kaṭapayādi, consonants stand for digits (ka, ṭa, pa, ya = 1 and so on), a bare vowel is 0, in a conjunct only the last consonant counts, and digits are read right to left. Converting Kali day 1712210 to a modern date gives late November or early December 1586 depending on the calendar conversion (Julian versus Gregorian). This is a devotional poem; the number is a chronogram, not mathematics in the text itself.",
  "related": [],
  "refs": [
   [
    "GRETIL: Nārāyaṇa Bhaṭṭa, Nārāyaṇīyam",
    "https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_nArAyaNabhaTTa-nArAyaNIya.txt"
   ],
   [
    "Namboothiri Websites: Katapayaadi (decoding of āyurārogyasaukhyam)",
    "https://namboothiri.com/articles/katapayaadi.htm"
   ],
   [
    "INDOLOGY list, March 2014: Converting Kali chronograms (Nārāyaṇīyam date)",
    "https://list.indology.info/pipermail/indology/2014-March/039177.html"
   ],
   [
    "Wikipedia: Katapayadi system",
    "https://en.wikipedia.org/wiki/Katapayadi_system"
   ]
  ],
  "confidence": "high"
 },
 {
  "id": "tirtha-gopi-pi",
  "group": "codes",
  "title": "The \"gopī bhāgya\" π verse (from Tirtha's book)",
  "kind": "verse",
  "meter": "anuṣṭubh",
  "deva": "गोपीभाग्यमधुव्रात शृङ्गिशोदधिसन्धिग ।\nखलजीवितखाताव गलहालारसन्धर ॥",
  "iast": "gopībhāgyamadhuvrāta śṛṅgiśodadhisandhiga |\nkhalajīvitakhātāva galahālārasandhara ||",
  "say": "go-pee-bhaa-gya-ma-dhu-VRAA-ta shring-gi-sho-da-dhi-SAN-dhi-ga | kha-la-jee-vi-ta-khaa-TAA-va ga-la-haa-laa-ra-SAN-dha-ra",
  "words": [
   [
    "go pī bhā gya",
    "3 1 4 1"
   ],
   [
    "ma dhu vrā ta",
    "5 9 2 6"
   ],
   [
    "śṛ ṅgi śo da",
    "5 3 5 8"
   ],
   [
    "dhi sa ndhi ga",
    "9 7 9 3"
   ],
   [
    "kha la jī vi",
    "2 3 8 4"
   ],
   [
    "ta khā tā va",
    "6 2 6 4"
   ],
   [
    "ga la hā lā",
    "3 3 8 3"
   ],
   [
    "ra sa ndha ra",
    "2 7 9 2"
   ]
  ],
  "meaning": "Tirtha says the verse can be read three ways: as a hymn to Kṛṣṇa, as a hymn to Śiva, and, through the letter-number code, as π/10 to 32 decimal places. He prints only the number, 0.31415926535897932384626433832792. (The word glosses above give the syllable-to-digit decoding rather than a translation, because the devotional readings are not spelled out in the book.)",
  "plain": "Each consonant stands for a digit, so the 32 syllables spell 3 1 4 1 5 9 2 6 ...: a clever memory rhyme for π, made in the 20th century.",
  "math": "π/10 ≈ 0.31415926535897932384626433832792 (31 decimals correct; the true 32nd decimal is 5)",
  "source": "Bharati Krishna Tirtha, Vedic Mathematics (1965), final chapter \"Miscellaneous Matters\" (about pp. 360 to 361 in common editions); the code is explained in the chapter on the Vedic numerical code. 20th century.",
  "note": "This is the only actual verse in Tirtha's book, and it is not ancient: no source before the book is known, and T. Hayashi called it \"a quite new production\" by Tirtha. Tirtha calls it well known and attaches no source. Standard Kaṭapayādi reads digits right to left (\"aṅkānāṃ vāmato gatiḥ\"), but this verse must be read left to right, and Tirtha's own key (with kṣa for zero) differs from the standard one. Our check: decoding gives 31 correct decimals, but the 32nd syllable (ra = 2) gives 2 where π/10 has 5 (0.31415926535897932384626433832795...). It is not the source of the 16 sūtras, which the book's editor V. S. Agrawala says were most likely the Swami's own.",
  "related": [],
  "refs": [
   [
    "Tirtha, Vedic Mathematics (archive.org OCR text: code chapter and Miscellaneous Matters)",
    "https://archive.org/details/vedic-mathematics-bharatikrishna-tirtha-english"
   ],
   [
    "Tirtha, Vedic Mathematics (second archive.org copy with the decoded value)",
    "https://archive.org/details/VedicMathematicsJagatguru"
   ],
   [
    "INDOLOGY list, Oct 1995: T. Hayashi on the verse as \"a quite new production\" by Tirtha",
    "https://list.indology.info/pipermail/indology/1995-October/003466.html"
   ],
   [
    "Wikipedia: Katapayadi system",
    "https://en.wikipedia.org/wiki/Katapayadi_system"
   ],
   [
    "arXiv math/0611347 (quotes Agrawala and Dani on the sūtras' origin)",
    "https://arxiv.org/pdf/math/0611347"
   ]
  ],
  "confidence": "high"
 }
];

export const slokasIn = group => SLOKAS.filter(s => s.group === group);
export const slokasFor = sutraId => SLOKAS.filter(s => s.related.includes(sutraId));
