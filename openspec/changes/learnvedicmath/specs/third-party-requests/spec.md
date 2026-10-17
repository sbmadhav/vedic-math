# Spec Delta

## Purpose

Decide in one place which third parties the site may reach, and make sure none of them, Google and YouTube above all, is reached before a Player does something that needs it.

## ADDED Requirements

### Requirement: Nothing to Google or YouTube on load
Opening any page of the site, the game's home and every view that is not a World board or a playing video SHALL make no request to a Google or YouTube host. The only other hosts reached without a Player's action SHALL be the two analytics endpoints, and those not at all when Do Not Track or Global Privacy Control is on.

#### Scenario: A full first visit
- **WHEN** a first-time visitor opens `/`, then `/play/`, picks a Mode, plays a Star and opens the Watch shelf
- **THEN** no request goes to any `google.com`, `gstatic.com`, `googleapis.com`, `ytimg.com`, `youtube.com` or `youtube-nocookie.com` host

### Requirement: One list of allowed hosts
`build.py` SHALL hold the one list of third-party hosts the site may reach, each with its reason and the action that first reaches it. The Content-Security-Policy SHALL be built from it, the build SHALL fail when a published file names a third-party host not on it, and the end-to-end tests SHALL fail on a request to a host not on it.

#### Scenario: A new host slips in
- **WHEN** a module is changed to fetch from a host not on the list
- **THEN** the build fails and names the host

### Requirement: Self-hosted thumbnails
Every Watch shelf entry SHALL have a thumbnail served from `/thumbs/` on this site, and the node tests SHALL fail when an entry has none.

#### Scenario: Watch shelf
- **WHEN** a Player opens the Watch shelf
- **THEN** every thumbnail loads from `/thumbs/` and nothing loads from `i.ytimg.com`

### Requirement: Self-hosted Firebase SDK, loaded late
The Firebase SDK SHALL be served from `/vendor/firebase/<version>/` with no import of any other origin, and SHALL load only when a Player whose Age answer is 13 or over opens a World board, when such a Player posts, or when a Player who posted is removed. reCAPTCHA (App Check) SHALL load only on those same paths.

#### Scenario: Under-13 Player plays the Arena
- **WHEN** a Player whose Age answer is 9 plays an Arena daily round and opens the Boards
- **THEN** no Firebase file and no reCAPTCHA file is requested

#### Scenario: A teen opens a World board
- **WHEN** a Player whose Age answer is 15 taps Show World board
- **THEN** the SDK loads from `/vendor/firebase/` and the list query is made, without signing in

### Requirement: Natural voice only after opting in
The natural voice's library and model SHALL be downloaded only after a Player opts in and confirms the download, and from no host other than those listed for it.

#### Scenario: Read aloud with the Studio voice
- **WHEN** an Explorer Player hears a question read aloud
- **THEN** no request goes to `cdn.jsdelivr.net` or `huggingface.co`
