# Spec Delta

## ADDED Requirements

### Requirement: A prerendered page counts nothing until it is shown
While a page is being prerendered, no route view, event or page view SHALL be sent; events raised in that time SHALL be queued and sent only if the page is shown. A prerendered page that is never shown SHALL send nothing.

#### Scenario: Prerender discarded
- **WHEN** Chrome prerenders `/learn/` and the visitor never opens it
- **THEN** no GoatCounter or Cloudflare Web Analytics request is made for it

#### Scenario: Prerender shown
- **WHEN** the visitor opens the prerendered `/learn/`
- **THEN** exactly one route view for Home is sent, after it is shown
