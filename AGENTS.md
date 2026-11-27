# Bloom Metrics: notes for AI agents

The project rules live in `.cursor/rules/` and apply to every agent, not only Cursor. Read them
before changing anything:

- `web-ui-components.mdc`: build UI only with the `Design*` (web-ui / Bloom) components and Bloom's
  type, spacing and radius scales.
- `design-compliance-check.mdc`: before calling UI work done, check it against web-ui and
  bloom-tokens, run `bloomAudit()` in the dev app, and report what you checked.
- `dates-yyyy-mm-dd.mdc`: dates always read `YYYY-MM-DD`.
