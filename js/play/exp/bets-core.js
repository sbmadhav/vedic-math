/* Estimation Bets logic (no DOM): the question bank, the scoring rule, the log-scale slider math, number
   parsing and calibration. Used by bets.js and test/bets.test.mjs.
   Answers prefer exact, computable facts (time, geometry, arithmetic) or well established constants;
   anything that depends on an assumption states it in the question. */
import { rng, shuffle, seedOf } from '../kit.js';

export const VERSION = 1;

/* [id, theme, levels (e explorer, c challenger, p pro), question, answer, unit, Fermi breakdown, source] */
const RAW = [
  /* ---------- Time ---------- */
  ['sec-week', 'time', 'cp', 'How many seconds are there in a week?', 604800, 'seconds', '7 days × 24 hours × 3,600 seconds', 'Arithmetic: definition of the second, minute and hour'],
  ['min-day', 'time', 'ecp', 'How many minutes are there in a day?', 1440, 'minutes', '24 hours × 60 minutes', 'Arithmetic: 24 hours of 60 minutes'],
  ['sec-day', 'time', 'cp', 'How many seconds are there in a day?', 86400, 'seconds', '24 × 60 × 60', 'Arithmetic: definition of the day in SI usage'],
  ['hr-leap', 'time', 'cp', 'How many hours are there in a leap year?', 8784, 'hours', '366 days × 24 hours', 'Calendar arithmetic'],
  ['hr-year', 'time', 'cp', 'How many hours are there in a 365 day year?', 8760, 'hours', '365 × 24', 'Calendar arithmetic'],
  ['min-week', 'time', 'cp', 'How many minutes are there in a week?', 10080, 'minutes', '7 × 24 × 60', 'Arithmetic'],
  ['sec-year', 'time', 'p', 'How many seconds are there in a 365 day year?', 31536000, 'seconds', '365 × 86,400 seconds per day', 'Calendar arithmetic'],
  ['days-century', 'time', 'p', 'How many days are there from 1 January 2001 to 31 December 2100, counting both?', 36524, 'days', '100 × 365 + 24 leap days (2100 is not a leap year)', 'Gregorian calendar rules'],
  ['billion-sec', 'time', 'cp', 'About how many years is one billion seconds?', 31.69, 'years', '1,000,000,000 ÷ 31,557,600 seconds in an average year', 'Arithmetic with a 365.25 day year'],
  ['million-sec', 'time', 'cp', 'How many days is one million seconds?', 11.57, 'days', '1,000,000 ÷ 86,400 seconds per day', 'Arithmetic'],
  ['hrs-2days', 'time', 'e', 'How many hours are there in 2 days?', 48, 'hours', '2 × 24 hours', 'Arithmetic'],
  ['days-3weeks', 'time', 'e', 'How many days are there in 3 weeks?', 21, 'days', '3 × 7 days', 'Calendar'],
  ['min-2hrs', 'time', 'e', 'How many minutes are there in 2 hours?', 120, 'minutes', '2 × 60 minutes', 'Arithmetic'],
  ['sec-hour', 'time', 'ec', 'How many seconds are there in one hour?', 3600, 'seconds', '60 minutes × 60 seconds', 'Arithmetic'],
  ['months-31', 'time', 'e', 'How many months of the year have 31 days?', 7, 'months', 'January, March, May, July, August, October, December', 'Gregorian calendar'],
  ['days-q1', 'time', 'ec', 'How many days are there from 1 January to 31 March in a year that is not a leap year, counting both?', 90, 'days', '31 + 28 + 31', 'Gregorian calendar'],
  ['hand-laps', 'time', 'ec', 'How many full turns does a clock\'s minute hand make in one day?', 24, 'turns', 'One turn per hour × 24 hours', 'Clock arithmetic'],
  ['hand-meet', 'time', 'cp', 'How many times do a clock\'s hour and minute hands point the same way in 12 hours?', 11, 'times', 'The minute hand laps the hour hand 12 − 1 times', 'Clock arithmetic'],
  ['angle-330', 'time', 'cp', 'What is the smaller angle between a clock\'s hands at 3:30, in degrees?', 75, 'degrees', 'Hour hand at 105°, minute hand at 180°: 180 − 105', 'Clock geometry'],
  ['ist', 'time', 'cp', 'How many hours is India Standard Time ahead of UTC?', 5.5, 'hours', 'IST is UTC + 5:30', 'Government of India (IST is defined from 82.5° E)'],
  ['tea-year', 'time', 'ec', 'If you drink 3 cups of tea every day, how many cups is that in a 365 day year?', 1095, 'cups', '3 × 365', 'Arithmetic'],

  /* ---------- Space ---------- */
  ['light-speed', 'space', 'cp', 'How many kilometres does light travel in one second?', 299792.458, 'km', 'Fixed by the definition of the metre', 'SI definition: c = 299,792,458 m/s'],
  ['moon-dist', 'space', 'cp', 'What is the average distance from the Earth to the Moon, in kilometres?', 384400, 'km', 'About 30 Earths lined up (30 × 12,742 km)', 'NASA'],
  ['sun-dist', 'space', 'p', 'What is the average distance from the Earth to the Sun, in kilometres?', 149597870.7, 'km', 'One astronomical unit', 'IAU definition of the astronomical unit (2012)'],
  ['sun-light', 'space', 'cp', 'How many seconds does sunlight take to reach the Earth?', 499, 'seconds', '149,597,871 km ÷ 299,792 km per second', 'IAU astronomical unit and SI speed of light'],
  ['moon-light', 'space', 'cp', 'How many seconds does light take to travel from the Moon to the Earth?', 1.28, 'seconds', '384,400 km ÷ 299,792 km per second', 'NASA distance and SI speed of light'],
  ['earth-circ', 'space', 'cp', 'How long is the Earth\'s equator, in kilometres?', 40075, 'km', 'π × 12,756 km equatorial diameter', 'WGS 84 Earth model'],
  ['earth-diam', 'space', 'cp', 'What is the Earth\'s mean diameter, in kilometres?', 12742, 'km', '2 × 6,371 km mean radius', 'IUGG mean Earth radius'],
  ['moon-diam', 'space', 'p', 'What is the Moon\'s diameter, in kilometres?', 3474.8, 'km', 'A bit more than a quarter of Earth\'s 12,742 km', 'NASA'],
  ['sun-earths', 'space', 'cp', 'How many Earths, side by side, would stretch across the Sun\'s diameter?', 109, 'Earths', '1,391,400 km ÷ 12,742 km', 'NASA'],
  ['sun-volume', 'space', 'p', 'About how many Earths would fit inside the Sun by volume?', 1300000, 'Earths', '109 × 109 × 109 is about 1.3 million', 'NASA'],
  ['mars-year', 'space', 'cp', 'How many Earth days does Mars take to go once around the Sun?', 687, 'days', 'About 1.88 Earth years × 365.25 days', 'NASA'],
  ['spin-speed', 'space', 'p', 'How fast does the ground at the equator move as the Earth spins, in km per hour?', 1674, 'km/h', '40,075 km ÷ 23.93 hours per turn', 'WGS 84 equator and the sidereal day'],
  ['orbit-speed', 'space', 'p', 'How fast does the Earth move around the Sun, in km per second?', 29.78, 'km/s', '2π × 149.6 million km ÷ 31.56 million seconds', 'NASA'],
  ['light-year', 'space', 'p', 'How many kilometres are in one light year?', 9460730472580.8, 'km', '299,792.458 km/s × 31,557,600 s (a Julian year)', 'IAU definition of the light year'],
  ['iss-orbits', 'space', 'p', 'How many times a day does the International Space Station go around the Earth?', 15.5, 'orbits', '1,440 minutes ÷ about 93 minutes per orbit', 'NASA'],
  ['moon-month', 'space', 'cp', 'How many days from one full moon to the next?', 29.53, 'days', 'The synodic month', 'NASA'],
  ['planets', 'space', 'e', 'How many planets go around our Sun?', 8, 'planets', 'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune', 'IAU (2006)'],
  ['earth-days', 'space', 'e', 'Ignoring leap days, how many days does the Earth take to go around the Sun?', 365, 'days', 'One year', 'Calendar'],

  /* ---------- Body (assumptions stated, so the answer is exact) ---------- */
  ['heart-day', 'body', 'cp', 'If a heart beats 70 times a minute, how many times does it beat in a day?', 100800, 'beats', '70 × 60 × 24', 'Arithmetic (70 a minute is a typical resting rate)'],
  ['heart-year', 'body', 'p', 'If a heart beats 70 times a minute, how many beats is that in a 365 day year?', 36792000, 'beats', '70 × 60 × 24 × 365', 'Arithmetic'],
  ['breaths-day', 'body', 'cp', 'If you breathe 15 times a minute, how many breaths do you take in a day?', 21600, 'breaths', '15 × 60 × 24', 'Arithmetic (12 to 20 a minute is typical at rest)'],
  ['air-day', 'body', 'p', 'Breathing 15 times a minute with half a litre each breath, how many litres of air is that in a day?', 10800, 'litres', '0.5 × 15 × 1,440 minutes', 'Arithmetic'],
  ['blinks', 'body', 'cp', 'If you blink 15 times a minute for 16 waking hours, how many blinks is that?', 14400, 'blinks', '15 × 60 × 16', 'Arithmetic'],
  ['bones', 'body', 'cp', 'How many bones are in a typical adult human skeleton?', 206, 'bones', 'Babies start with about 300; many fuse as they grow', 'Gray\'s Anatomy'],
  ['teeth-adult', 'body', 'ecp', 'How many teeth are in a full adult set, wisdom teeth included?', 32, 'teeth', '8 in each quarter of the mouth × 4', 'Standard dental anatomy'],
  ['teeth-milk', 'body', 'e', 'How many milk teeth does a child usually have?', 20, 'teeth', '5 in each quarter × 4', 'Standard dental anatomy'],
  ['chromo', 'body', 'cp', 'How many chromosomes are in a typical human body cell?', 46, 'chromosomes', '23 pairs', 'Human genetics'],
  ['fingers-10', 'body', 'e', 'How many fingers do 10 people have altogether (thumbs count)?', 100, 'fingers', '10 people × 10 fingers', 'Counting'],
  ['toes-4', 'body', 'e', 'How many toes do 4 people have altogether?', 40, 'toes', '4 × 10', 'Counting'],
  ['steps-km', 'body', 'ec', 'With steps 75 centimetres long, about how many steps does it take to walk 1 kilometre?', 1333, 'steps', '100,000 cm ÷ 75 cm', 'Arithmetic'],
  ['steps-5k', 'body', 'cp', 'With steps 70 centimetres long, about how many steps is a 5 km walk?', 7143, 'steps', '500,000 cm ÷ 70 cm', 'Arithmetic'],

  /* ---------- India and the world ---------- */
  ['qutub', 'india', 'cp', 'How tall is the Qutub Minar in Delhi, in metres?', 72.5, 'metres', 'About 24 storeys of 3 metres', 'Archaeological Survey of India'],
  ['statue-unity', 'india', 'cp', 'How tall is the Statue of Unity in Gujarat, in metres?', 182, 'metres', 'About 2.5 times the Qutub Minar', 'Statue of Unity, Government of Gujarat'],
  ['chakra', 'india', 'ec', 'How many spokes does the Ashoka Chakra on India\'s flag have?', 24, 'spokes', 'The wheel comes from the Lion Capital of Ashoka at Sarnath', 'Flag Code of India'],
  ['lakh-crore', 'india', 'ec', 'How many lakhs make one crore?', 100, 'lakhs', '1,00,00,000 ÷ 1,00,000', 'Indian numbering system'],
  ['paise', 'india', 'e', 'How many paise are there in 10 rupees?', 1000, 'paise', '10 × 100 paise', 'Reserve Bank of India: 100 paise = 1 rupee'],
  ['coins-100', 'india', 'e', 'How many 5 rupee coins make 100 rupees?', 20, 'coins', '100 ÷ 5', 'Arithmetic'],
  ['census-2011', 'india', 'p', 'According to the 2011 Census, how many people lived in India?', 1210854977, 'people', 'About 1.21 billion, or 121 crore', 'Census of India 2011'],
  ['india-area', 'india', 'p', 'What is India\'s area in square kilometres?', 3287263, 'km²', 'About 3.3 million km²', 'Government of India'],
  ['lok-sabha', 'india', 'cp', 'How many Lok Sabha seats are filled by election?', 543, 'seats', 'One per parliamentary constituency', 'Election Commission of India'],
  ['languages-8', 'india', 'cp', 'How many languages are listed in the Eighth Schedule of the Constitution of India?', 22, 'languages', 'From Assamese to Urdu', 'Constitution of India, Eighth Schedule'],
  ['kanchenjunga', 'india', 'p', 'How tall is Kangchenjunga, India\'s highest peak, in metres?', 8586, 'metres', 'Third highest mountain on Earth', 'Survey of India'],
  ['everest', 'india', 'cp', 'How tall is Mount Everest, in metres?', 8848.86, 'metres', 'Almost 9 km straight up', 'Joint survey by Nepal and China (2020)'],
  ['burj', 'india', 'cp', 'How tall is the Burj Khalifa in Dubai, in metres?', 828, 'metres', 'About 11 Qutub Minars stacked', 'Council on Tall Buildings and Urban Habitat'],
  ['un-members', 'india', 'cp', 'How many member states does the United Nations have?', 193, 'countries', 'South Sudan joined last, in 2011', 'United Nations'],
  ['gita', 'india', 'cp', 'How many verses are in the Bhagavad Gita?', 700, 'verses', '18 chapters, 700 verses in the standard text', 'Standard critical edition'],
  ['kural', 'india', 'p', 'How many couplets are in the Thirukkural?', 1330, 'couplets', '133 chapters × 10 couplets', 'The Thirukkural'],
  ['ocean-pct', 'india', 'cp', 'About what percent of the Earth\'s surface is covered by ocean?', 71, 'percent', 'About 361 of 510 million km²', 'NOAA'],
  ['auto-wheels', 'india', 'e', 'How many wheels do 7 autorickshaws have altogether?', 21, 'wheels', '7 × 3 wheels', 'Counting'],

  /* ---------- Food ---------- */
  ['rice-kg', 'food', 'cp', 'If one grain of rice weighs 0.02 grams, how many grains are in a 1 kg bag?', 50000, 'grains', '1,000 g ÷ 0.02 g', 'Arithmetic (long grain rice is around 0.02 g a grain)'],
  ['roti', 'food', 'ec', 'If each roti uses 30 grams of flour, how many full rotis can you make from a 5 kg bag?', 166, 'rotis', '5,000 g ÷ 30 g = 166.7, so 166 full rotis', 'Arithmetic'],
  ['idli', 'food', 'ec', 'If each idli uses 40 grams of batter, how many idlis from 1 kg of batter?', 25, 'idlis', '1,000 g ÷ 40 g', 'Arithmetic'],
  ['dosa-area', 'food', 'p', 'What is the area of a round dosa 30 cm across, in square centimetres?', 706.86, 'cm²', 'π × 15 × 15', 'Geometry'],
  ['eggs-3doz', 'food', 'e', 'How many eggs are in 3 dozen?', 36, 'eggs', '3 × 12', 'Counting'],
  ['gross', 'food', 'ec', 'How many eggs are in a gross (a dozen dozen)?', 144, 'eggs', '12 × 12', 'Counting'],
  ['ml-litre', 'food', 'e', 'How many millilitres are in a litre?', 1000, 'mL', 'Milli means one thousandth', 'SI prefixes'],
  ['litre-m3', 'food', 'ec', 'How many litres of water fill a box 1 metre on each side?', 1000, 'litres', '10 dm × 10 dm × 10 dm, and 1 dm³ is 1 litre', 'SI definition of the litre'],
  ['water-boil-f', 'food', 'cp', 'At sea level, water boils at what temperature in Fahrenheit?', 212, '°F', '100 °C × 9/5 + 32', 'Temperature scale definitions'],
  ['laddoo', 'food', 'e', 'A box has 4 rows of 6 laddoos. How many laddoos?', 24, 'laddoos', '4 × 6', 'Counting'],

  /* ---------- Sport ---------- */
  ['pitch', 'sport', 'cp', 'How long is a cricket pitch from stumps to stumps, in metres?', 20.12, 'metres', '22 yards × 0.9144 metres', 'Laws of Cricket (MCC)'],
  ['odi-balls', 'sport', 'ec', 'How many legal balls are bowled in a full 50 over innings?', 300, 'balls', '50 overs × 6 balls', 'Laws of Cricket (MCC)'],
  ['t20-balls', 'sport', 'e', 'How many legal balls are in a full 20 over innings?', 120, 'balls', '20 × 6', 'Laws of Cricket (MCC)'],
  ['marathon', 'sport', 'cp', 'How long is a marathon, in metres?', 42195, 'metres', '42 km plus 195 m', 'World Athletics'],
  ['bolt-speed', 'sport', 'p', 'The 100 m world record is 9.58 seconds. What is that average speed in km per hour?', 37.58, 'km/h', '100 ÷ 9.58 m/s × 3.6', 'World Athletics record and arithmetic'],
  ['kabaddi', 'sport', 'e', 'How many players from each team are on a kabaddi court at the start?', 7, 'players', 'Seven on court, more on the bench', 'Amateur Kabaddi Federation of India rules'],
  ['hockey', 'sport', 'ec', 'How many minutes of play are in a field hockey match?', 60, 'minutes', '4 quarters × 15 minutes', 'FIH Rules of Hockey'],
  ['tennis-min', 'sport', 'p', 'What is the fewest points a player can win to win a best of five sets tennis match?', 72, 'points', '3 sets × 6 games × 4 points', 'Rules of tennis (ITF)'],
  ['shuttle', 'sport', 'cp', 'How many feathers does a badminton shuttlecock have?', 16, 'feathers', 'Fixed in a cork base', 'BWF Laws of Badminton'],
  ['pool', 'sport', 'e', 'How long is an Olympic swimming pool, in metres?', 50, 'metres', 'Two lengths make a 100 m race', 'World Aquatics'],
  ['hoop', 'sport', 'cp', 'How high is a basketball hoop, in centimetres?', 305, 'cm', '10 feet × 30.48 cm', 'FIBA rules'],
  ['chess-first', 'sport', 'cp', 'How many different first moves does White have in chess?', 20, 'moves', '16 pawn moves + 4 knight moves', 'Rules of chess (FIDE)'],
  ['chess-400', 'sport', 'p', 'How many different positions can the board be in after White and Black have each made one move?', 400, 'positions', '20 first moves × 20 replies', 'Rules of chess (FIDE)'],
  ['football-22', 'sport', 'e', 'How many players are on a football field when both teams are complete?', 22, 'players', '2 teams × 11', 'IFAB Laws of the Game'],

  /* ---------- Nature ---------- */
  ['spiders-6', 'nature', 'e', 'How many legs do 6 spiders have altogether?', 48, 'legs', '6 × 8 legs', 'Biology: spiders have 8 legs'],
  ['ants-12', 'nature', 'e', 'How many legs do 12 ants have altogether?', 72, 'legs', '12 × 6 legs', 'Biology: insects have 6 legs'],
  ['cows-hens', 'nature', 'e', 'How many legs do 5 cows and 3 hens have together?', 26, 'legs', '5 × 4 + 3 × 2', 'Counting'],
  ['octopus', 'nature', 'ec', 'How many hearts does an octopus have?', 3, 'hearts', 'Two for the gills, one for the body', 'Marine biology'],
  ['honeycomb', 'nature', 'e', 'How many sides does each cell of a honeycomb have?', 6, 'sides', 'Hexagons tile with no gaps', 'Geometry of the hexagon'],
  ['sound', 'nature', 'cp', 'How far does sound travel in air in one second at 20 °C, in metres?', 343, 'metres', 'About 1 km every 3 seconds', 'Standard physics value'],
  ['thunder', 'nature', 'cp', 'You see lightning and hear thunder 6 seconds later. About how many metres away was it?', 2058, 'metres', '6 s × 343 m/s', 'Arithmetic with the speed of sound at 20 °C'],
  ['rainbow', 'nature', 'e', 'How many colours are usually named in a rainbow?', 7, 'colours', 'VIBGYOR', 'Newton\'s traditional naming'],

  /* ---------- Numbers and shapes ---------- */
  ['chess-squares', 'numbers', 'cp', 'How many squares of all sizes are on a chessboard?', 204, 'squares', '1² + 2² + ... + 8²', 'Arithmetic'],
  ['chess-rice', 'numbers', 'p', 'In the old chessboard legend told in India and Persia, 1 grain goes on the first square and the amount doubles on each square. How many grains in all?', 18446744073709551615, 'grains', '2^64 − 1', 'Arithmetic'],
  ['pins', 'numbers', 'ec', 'How many different 4 digit PINs are possible (0000 to 9999)?', 10000, 'PINs', '10 × 10 × 10 × 10', 'Counting'],
  ['books-5', 'numbers', 'cp', 'In how many orders can you line up 5 different books on a shelf?', 120, 'orders', '5 × 4 × 3 × 2 × 1', 'Counting'],
  ['handshakes', 'numbers', 'cp', 'If 30 people each shake hands once with everyone else, how many handshakes?', 435, 'handshakes', '30 × 29 ÷ 2', 'Counting'],
  ['two-10', 'numbers', 'ec', 'What is 2 multiplied by itself 10 times (2^10)?', 1024, '', '2, 4, 8, 16, 32, 64, 128, 256, 512, 1024', 'Arithmetic'],
  ['gauss', 'numbers', 'cp', 'What is 1 + 2 + 3 + ... + 100?', 5050, '', '50 pairs that each make 101', 'Arithmetic'],
  ['primes-100', 'numbers', 'cp', 'How many prime numbers are there below 100?', 25, 'primes', '2, 3, 5, 7, 11 ... 97', 'Number theory'],
  ['ones-100', 'numbers', 'cp', 'Writing every number from 1 to 100, how many times do you write the digit 1?', 21, 'times', '10 in the units place + 10 in the tens place + 1 in 100', 'Counting'],
  ['sevens', 'numbers', 'cp', 'How many whole numbers from 1 to 1000 can be divided exactly by 7?', 142, 'numbers', '1000 ÷ 7 = 142.86, so 142', 'Arithmetic'],
  ['doublings', 'numbers', 'cp', 'Starting at 1, how many doublings does it take to pass one million?', 20, 'doublings', '2^20 = 1,048,576', 'Arithmetic'],
  ['paper-fold', 'numbers', 'p', 'Paper 0.1 mm thick is folded in half 42 times. How thick would it be, in kilometres?', 439804.65, 'km', '0.1 mm × 2^42, more than the distance to the Moon', 'Arithmetic (no real paper can be folded that often)'],
  ['rubik', 'numbers', 'p', 'How many different positions can a 3×3×3 Rubik\'s Cube be scrambled into?', 43252003274489856000, 'positions', '8! × 3^7 × 12! × 2^10 ÷ 2', 'Group theory of the cube'],
  ['hexagon-angles', 'numbers', 'cp', 'What do the inside angles of a hexagon add up to, in degrees?', 720, 'degrees', '(6 − 2) × 180°', 'Geometry'],
  ['diag-square', 'numbers', 'cp', 'How long is the diagonal of a square with 1 metre sides, in centimetres?', 141.42, 'cm', '100 × √2. The Baudhāyana Śulba Sūtra gives √2 as about 1.4142', 'Geometry'],
  ['circle-10', 'numbers', 'cp', 'What is the area of a circle of radius 10 cm, in square centimetres?', 314.16, 'cm²', 'π × 10 × 10', 'Geometry'],
  ['cube-edges', 'numbers', 'e', 'How many edges does a cube have?', 12, 'edges', '4 on top, 4 on the bottom, 4 standing up', 'Geometry'],
  ['domino', 'numbers', 'p', 'How many dots are on all the tiles of a double six domino set?', 168, 'dots', '28 tiles; each number 0 to 6 appears 8 times: 8 × 21', 'Counting'],
  ['dice-dots', 'numbers', 'e', 'How many dots are on a standard die altogether?', 21, 'dots', '1 + 2 + 3 + 4 + 5 + 6', 'Counting'],
  ['cards', 'numbers', 'ec', 'How many cards are in a standard deck, without jokers?', 52, 'cards', '4 suits × 13 cards', 'Standard playing cards'],
  ['piano', 'numbers', 'ec', 'How many keys are on a standard piano?', 88, 'keys', '52 white + 36 black', 'Standard modern piano'],
  ['ream', 'numbers', 'ec', 'How many sheets are in a ream of paper?', 500, 'sheets', '20 quires × 25 sheets', 'Paper trade standard'],
  ['save-10', 'numbers', 'e', 'Saving 10 rupees every day, how many rupees in a 365 day year?', 3650, 'rupees', '10 × 365', 'Arithmetic'],
  ['shapes-sides', 'numbers', 'e', 'How many sides do 4 triangles and 2 squares have altogether?', 20, 'sides', '4 × 3 + 2 × 4', 'Counting']
];

export const THEMES = { time: 'Time', space: 'Space', body: 'Body', india: 'India and the world', food: 'Food', sport: 'Sport', nature: 'Nature', numbers: 'Numbers and shapes' };
const LV = { e: 'explorer', c: 'challenger', p: 'pro' };
export const BANK = RAW.map(([id, theme, lv, q, a, unit, fermi, source]) => ({ id, theme, levels: [...lv].map(c => LV[c]), q, a, unit, fermi, source }));
export const byId = id => BANK.find(x => x.id === id);
export const forLevel = lv => BANK.filter(x => x.levels.includes(lv));

/* ---------- Scoring ---------- */
/* Width in decades: log10(high / low). 0 is a single number, 1 is a range like 10 to 100. */
export const width = (lo, hi) => Math.log10(hi / lo);
/* Tightness: 10 for an exact guess, 5 when high is twice low, about 2.3 for a tenfold range, never zero */
export const tightness = (lo, hi) => 10 / (1 + 3.32 * width(lo, hi));
/* Chips are a promise. Win chips × tightness when the answer is inside; lose more for bigger promises.
   With these losses, 2 chips beat 1 when you are at least 60% sure and 3 beat 2 at 80%, so the best bet
   is the honest one (the chip part is a proper scoring rule; width is rewarded on top). */
export const WIN = [0, 1, 2, 3];
export const LOSE = [0, 0.5, 2, 6];
export const contains = (lo, hi, a) => a >= lo * (1 - 1e-9) && a <= hi * (1 + 1e-9);
export function score(lo, hi, chips, answer) {
  if (!(lo > 0) || !(hi >= lo) || !WIN[chips]) throw new RangeError('bad bet');
  const k = tightness(lo, hi), hit = contains(lo, hi, answer);
  return { hit, tight: k, points: Math.round(hit ? k * WIN[chips] : -k * LOSE[chips]) };
}
/* The confidence (chance of being right) at which each chip count stops being the best bet */
export const breakEven = c => (LOSE[c + 1] - LOSE[c]) / (WIN[c + 1] - WIN[c] + LOSE[c + 1] - LOSE[c]);
export const TARGET = { 1: 'about half the time', 2: 'about 7 in 10', 3: '8 in 10 or more' };
export const RULE = 'Catch the answer to win your chips times a tightness score (up to 10); a miss costs more the more chips you bet, so 3 chips only pay when you are really sure.';

/* ---------- Calibration ---------- */
/* history: [{ chips, hit }] -> { 1: { n, hit }, 2: ..., 3: ... } */
export function calibration(history) {
  const out = { 1: { n: 0, hit: 0 }, 2: { n: 0, hit: 0 }, 3: { n: 0, hit: 0 } };
  for (const h of history) if (out[h.chips]) { out[h.chips].n++; if (h.hit) out[h.chips].hit++; }
  return out;
}

/* ---------- The log slider ---------- */
/* Each question gets slider bounds a few decades around the answer, shifted by a seeded amount so the
   middle of the slider never gives the answer away */
export function bounds(item, lv = 'challenger') {
  const r = rng(seedOf('bets-range', item.id, VERSION));
  const e = Math.log10(item.a);
  const below = (lv === 'explorer' ? 1 : 2) + r() * 1.5, above = (lv === 'explorer' ? 1 : 2) + r() * 1.5;
  let lo = Math.floor(e - below), hi = Math.ceil(e + above);
  if (item.a >= 1 && lo < 0) lo = 0;
  if (hi - lo < 3) hi = lo + 3;
  return [10 ** lo, 10 ** hi];
}
export const toSlider = (v, [lo, hi]) => Math.round(1000 * (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));
export const fromSlider = (s, [lo, hi]) => nice(10 ** (Math.log10(lo) + (s / 1000) * (Math.log10(hi) - Math.log10(lo))));
/* Rounds to 2 significant figures so slider values read like guesses (340, not 337.2) */
export const nice = v => (v > 0 ? +v.toPrecision(2) : v);

/* Typed numbers: 1200, 1,200, 1.2k, 3 million, 2.5 crore, 4 lakh, 1e6 */
const WORDS = { k: 1e3, thousand: 1e3, lakh: 1e5, lakhs: 1e5, m: 1e6, mn: 1e6, million: 1e6, millions: 1e6, crore: 1e7, crores: 1e7, cr: 1e7, b: 1e9, bn: 1e9, billion: 1e9, billions: 1e9, t: 1e12, trillion: 1e12 };
export function parseNum(text) {
  const s = String(text || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
  const m = s.match(/^(\d*\.?\d+(?:e\d+)?)\s*([a-z]*)$/);
  if (!m) return NaN;
  const mult = m[2] ? WORDS[m[2]] : 1;
  if (!mult) return NaN;
  const v = parseFloat(m[1]) * mult;
  return v > 0 && Number.isFinite(v) ? v : NaN;
}
/* Friendly display: 604,800 / 1.3 million / 0.5 / 18.4 quintillion */
export function show(v) {
  if (!Number.isFinite(v)) return '?';
  const big = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion']];
  for (const [d, w] of big) if (v >= d) return `${+(v / d).toPrecision(3)} ${w}`;
  if (v >= 1e7) return `${+(v / 1e6).toPrecision(3)} million`;
  if (v >= 100) return Math.round(v).toLocaleString('en-US');
  return String(+v.toPrecision(4));
}

/* A round: questions for this level, new ones first, in a seeded order */
export function deal(lv, seen = [], n = 5, seed = 1) {
  const pool = forLevel(lv), fresh = pool.filter(x => !seen.includes(x.id)), old = pool.filter(x => seen.includes(x.id));
  const r = rng(seedOf('bets', `${lv}:${seed}`, VERSION));
  return [...shuffle(r, fresh), ...shuffle(r, old)].slice(0, n);
}
