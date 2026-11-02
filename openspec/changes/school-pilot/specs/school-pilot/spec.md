# Spec Delta

## ADDED Requirements

### Requirement: A class code is random and kept by the teacher
The teacher page SHALL make a class code of two fixed-list words and two digits at random, never derived from a class name, and SHALL keep the class name and the seat list (1 to 40) only in the teacher's browser under its own keys.

#### Scenario: A teacher makes a class
- **WHEN** a teacher types "Year 5 maths" on `/teachers/class/` and presses Make a class code
- **THEN** the page shows a code such as `MAPLE-FOX-42` whose words are not in the class name, a seat list 1 to 40, and no request leaves the site

### Requirement: A Player joins a class on the device
A Player SHALL join a class by typing the code and a seat number from 1 to 40 on the Me page. The class and seat SHALL be stored with the Player on the device, shown on the Me page, removable in one tap, carried by the backup code, and never sent anywhere. Joining SHALL change nothing else: not the Age answer, the Mode, Placement, any Board, or whether Firebase loads.

#### Scenario: A student joins
- **WHEN** a Player whose Age answer is under 13 types `MAPLE-FOX-42` and seat 12 under Join a class on the Me page
- **THEN** the Me page shows "Class MAPLE-FOX-42, seat 12" with Leave class, the Player's record holds the class and seat, no Firebase request is made, and the Age answer is not asked

#### Scenario: Leaving
- **WHEN** the Player presses Leave class
- **THEN** the class and seat are removed from the record and the Me page shows Join a class again

### Requirement: The class report code holds counts
The Me page SHALL show, for a Player with a seat, a class report code of 20 base32 characters (in groups of four, and as a QR code drawn on the device) encoding a version, the class code, the seat, the ISO week, Stars lit, Katas done, Skills mastered, Sparks this week and Tricks watched, with a 16-bit checksum, and SHALL show the same counts in words beside it.

#### Scenario: Showing a report
- **WHEN** a Player in class `MAPLE-FOX-42`, seat 12, with 4 Stars, 9 Katas, 12 Skills, 310 Sparks this week and 3 Tricks watched presses Show my class report
- **THEN** a 20-character code and a QR code are shown with the words "4 Stars, 9 Katas, 12 Skills, 310 Sparks this week, 3 Tricks watched", and decoding the code gives exactly those fields and the current ISO week

### Requirement: A report code carries nothing personal and is checked
A report code SHALL carry no Nickname, Player id, Age or Grade answer, Mode, Board entry, timestamp or device detail. The decoder SHALL refuse a code whose checksum fails, whose seat is over 40, or whose version it does not know.

#### Scenario: A damaged code
- **WHEN** one character of a report code is changed
- **THEN** the decoder refuses it and the teacher page says "That code could not be read. Check it against the screen."

#### Scenario: The fields are numbers only
- **WHEN** the encoder is given a Nickname or an age in any field
- **THEN** it refuses, because every field is a bounded number

### Requirement: The teacher page reads reports on the teacher's device only
`/teachers/class/` SHALL accept a report by typing or by scanning its QR code with the camera (only where the page's policy allows the on-device reader, with no frame kept and the camera stopped on a route change or a hidden tab), fill that seat's row for that week, and show a seat-by-week table, a per-Trick view and a print view. It SHALL store everything under keys prefixed `lvm.class.`, send nothing, export no file, and remove every key on Clear class.

#### Scenario: Three reports
- **WHEN** a teacher enters report codes for seats 3, 12 and 25 of this week
- **THEN** the table shows those three rows with their counts, the other seats stay empty, and `localStorage` holds no key outside `lvm.class.`

#### Scenario: Clear class
- **WHEN** the teacher presses Clear class and confirms
- **THEN** the class, its code and every report are gone from the browser

### Requirement: The pilot pack says what is true
`/teachers/pilot/` SHALL say what the site is (naming Bharati Krishna Tirtha's 1965 book), what it stores and where, that anonymous page counts are sent unless Do Not Track or Global Privacy Control is on, and that whether a school needs a privacy review is the school's decision. It SHALL link the privacy policy, offer the class list sheet and the free practice packs to print, give the owner's contact, make no claim of compliance with any law, and never say a school needs no review.

#### Scenario: The pilot page
- **WHEN** a teacher opens `/teachers/pilot/`
- **THEN** the page names the 1965 book, links `/privacy/`, says the review is the school's decision, and contains neither "COPPA compliant" nor "no IT approval"

### Requirement: The class store waits for an ADR and a lawyer
No report SHALL be sent from a Player's device to any server under this change. A class store (reports posted to a route keyed by the class code) SHALL be built only under a later change that cites a successor to ADR 0006, a lawyer's sign-off on school authorization, FERPA and state student-privacy laws, a school contract, and Workers Paid.

#### Scenario: Nothing leaves the device
- **WHEN** a Player in a class plays for a week and shows a report
- **THEN** no request carrying the class code, the seat or any count leaves the device
