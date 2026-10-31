# Spec Delta

## ADDED Requirements

### Requirement: Install counts
The system SHALL send `math/install/<event>` events made of fixed words: `nudge_shown` once per page load, `nudge_later`, `wizard_open/<home|me|footer|guide>`, `prompt_accepted` or `prompt_dismissed`, `installed` on `appinstalled`, and `opened` once per page load in the Installed app. No install event SHALL name the browser, the platform, the Mode or a count, and they SHALL follow "Events carry no identifiers".

#### Scenario: From the nudge to the app
- **WHEN** a Player sees the nudge on Android, presses Install and accepts Chrome's dialog
- **THEN** `math/install/nudge_shown` and `math/install/prompt_accepted` are sent once each, and `math/install/installed` when Chrome reports the install

#### Scenario: The guide from the Me page
- **WHEN** a Player opens the Install guide from the Me page
- **THEN** exactly `math/install/wizard_open/me` is sent

#### Scenario: Event contents
- **WHEN** every install event is listed
- **THEN** each path is `math/install/` followed by one of the fixed words above, and its title is "Vedic Math: install"
