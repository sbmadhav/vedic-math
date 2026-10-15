# No anonymous identity until the first post

Opening a World board or earning XP used to create an anonymous Firebase ID even when nothing was ever posted. We create the ID only at a Player's first actual post, after the Age answer and, if needed, the Parent step. Viewing World boards needs no identity, so the database rules allow capped, read-only list queries on Boards without sign-in. Writes still require the ID.

## Consequences

- A Player who never posts never has an identifier anywhere outside the device.
- Anyone can read the top entries of a Board. They hold only Nicknames, avatar colors, Scores and times, so this exposes nothing new.
