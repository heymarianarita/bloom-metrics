# Roadmap

- [x] Sidebar nav icons (Impact/Adoption/Documentation)
- [x] Simplify Figma date filter to preset dropdown + custom range
- [x] Performance page: quarter tabs table + chart UI
- [x] Performance page: paste-from-Google-Doc data entry (structured paste -> app database)
- [x] Performance page: parse tab-less Google Doc paste (RAG anchors, team sections, bullets)
- [ ] Optional: keyless Google Sheet import (needs sheet shared "anyone with the link")

## Admin & data management
- [x] Auth + admin role tables, RLS lockdown of writes
- [x] Sign-in page (email/password + Google) and admin guard
- [x] Settings area behind top-bar gear: data sources, performance data, manual metrics, sync history
- [ ] Move source IDs (Figma keys, sheet IDs, GA4 properties) from localStorage/env into the database
- [x] "Dynamic" vs "Manual" tag on every data panel and settings row
- [x] Single database of record: history of every recorded value + CSV export from Settings

## AI prototyping templates
- [x] Adoption sub-tab `/metrics/adoption/ai-prototyping`
- [x] Manual per-quarter entry: prototypes created, active users, active teams, share on Bloom
