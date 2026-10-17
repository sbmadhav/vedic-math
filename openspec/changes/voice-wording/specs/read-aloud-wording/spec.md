# Spec Delta

## ADDED Requirements

### Requirement: Question marks and blanks
`normalize()` in `js/voice.js` SHALL NOT read a "?" that ends a question as "what". It SHALL read a "?" placeholder as "what".

#### Scenario: A number bond
- **WHEN** read aloud says "3 and how many more make <b>10</b>?"
- **THEN** the words are "3 and how many more make 10?"

#### Scenario: Two blanks
- **WHEN** read aloud says "124 &divide; 5 = ? remainder ?"
- **THEN** the words are "124 divided by 5 equals what, remainder what?"

### Requirement: Ordinals and fractions as words
Ordinals SHALL be said as words. Fractions of whole numbers with a denominator from 2 to 100, or 1000, SHALL be named.

#### Scenario: Ordinals
- **WHEN** read aloud says "Keep the 12ths." and "the 6th multiple"
- **THEN** the words are "Keep the twelfths." and "the sixth multiple"

#### Scenario: Fraction names
- **WHEN** read aloud says a fraction of 7 over 12
- **THEN** the words are "seven twelfths"

### Requirement: Brackets keep their grouping
A bracketed expression SHALL be read by what it holds:
- a function argument with "of";
- an aside as a pause;
- a pair of coordinates as "the point";
- a multiplied or raised group as "the quantity".

#### Scenario: Composition
- **WHEN** read aloud says "Find <i>f</i>(<i>g</i>(1))."
- **THEN** the words are "Find f of g of 1."

#### Scenario: A power of a bracket
- **WHEN** read aloud says "(4<i>x</i> + 3)<sup>4</sup>"
- **THEN** the words are "the quantity 4 x plus 3, to the power of 4"

#### Scenario: Two points
- **WHEN** read aloud says "Find the midpoint of (&minus;5, &minus;5) and (&minus;11, 3)."
- **THEN** the words are "Find the midpoint of the point negative 5, negative 5, and the point negative 11, 3."

### Requirement: Negative numbers
A minus with nothing to subtract from SHALL be read as "negative". This includes a minus at the start of a line or after a word.

#### Scenario: A system of equations
- **WHEN** read aloud says "Solve:<br>&minus;4<i>x</i> &minus; 2<i>y</i> = &minus;28<br>&minus;<i>x</i> + <i>y</i> = 2"
- **THEN** the words are "Solve: negative 4 x minus 2 y equals negative 28. negative x plus y equals 2"

### Requirement: Nothing unreadable is spoken
No spoken line SHALL contain a symbol, an HTML leftover, digits followed by letters, a word twice in a row, or a sentence over 160 characters with no comma.

#### Scenario: Every generated line
- **WHEN** every Skill, Kata, Arena League, Pro mental family and tower is sampled with a fixed seed and normalized
- **THEN** no line has a leftover symbol, digits followed by letters, "what what", a word twice in a row, stray punctuation or a sentence over 160 characters with no comma

### Requirement: A question can say what its picture shows
A question MAY carry an optional `say` (HTML). When it does, every place that reads the question aloud SHALL say `say` instead of `q`. These places are Practice, Hear it, Kata, Arena tap rounds and towers, and Stars. The screen SHALL still show `q`. The comparison box, missing angle, right triangle, rectangle and box questions SHALL have a `say` that gives the numbers in the picture.

#### Scenario: Compare two numbers
- **WHEN** an Explorer Player gets "89 □ 57" in Practice
- **THEN** the screen shows "89 □ 57" and the voice says "Compare 89 and 57. Which sign goes in the box: less than, equals, or greater than?"

#### Scenario: Hear it on a right triangle
- **WHEN** a Challenger Player taps Hear it on "Find the hypotenuse c."
- **THEN** the voice says "A right triangle has legs 6 and 8. Find the hypotenuse c." with the legs from the picture

### Requirement: The hint read is the hint shown
After a second wrong try in Explorer Practice, the voice SHALL read the same hint that is shown on screen.

#### Scenario: Second wrong try
- **WHEN** an Explorer Player answers "6 − 1 = ?" wrong twice
- **THEN** the hint shown starts "Hint: Think: 1 + ? = 6" and the voice says "Think: 1 plus what equals 6"
