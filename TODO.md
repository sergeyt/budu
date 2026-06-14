# EXECUTION PLAN
- [ ] Batumi Podvalchik :)
  - [ ] need telegram bot

# DOCS
- [ ] improve readme:
  - [ ] include all used tools, Sentry is missing

# TESTING
- [x] yandex sign-in
- [x] register/unregister
- [ ] waitlist

# BUGS & IMPROVEMENTS
- [x] hide Place selector if not logged in
- [x] use SVG icons for sign-in providers
- [x] super-admin functions:
  - [x] reuse event for current date (dagomys case)
  - [ ] time selector
  - [ ] select place admins
- [ ] db scripts
  - [x] seed script
  - [ ] delete events, better event names?
  - [ ] script to generate fake users
  - [ ] script to add registrations to event for fake users
- [ ] database / postgres
  - [ ] CI integration tests on `postgres:17` (match Neon prod major)
  - [ ] plan PG 17 → 18 migration on Neon (new project + pg_dump/restore; Neon does not do in-place major upgrades)
- [x] hide sign-in providers if env variables are empty
- [ ] better design & theme
  - [x] theme switch
  - [x] render card
  - [x] place info drawer (including name, description and location URL)
  - [x] better place selector preferably with async search
  - [ ] show capacity info in tooltip since usually people already know it. or as a small badge with 3 numbers. registered/capacity/waitlist
- [x] refactorings:
  - [x] extract model types and reuse in code, never ending :)
  - [ ] use typed errors more

# NEW FEATURES
- [x] internationalization
  - [x] basic next-intl integration
  - [x] ru translations
  - [ ] switch between lang
- [ ] notification about event registrations
  - [ ] send list to MAX chat 
  - [ ] complete MAX notification on testing chat
- [ ] sign-up by email & phone number 
- [ ] sign-in by email or phone number
