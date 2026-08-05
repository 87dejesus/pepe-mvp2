# Coding standards

Swift API Design Guidelines, with the additions below. SwiftLint and SwiftFormat
configs land with the first code; until then these are the rules.

- Domain vocabulary comes from `docs/product/GLOSSARY.md`. If the product calls
  it a *promise*, the type is `Promise` — not `Goal`, `Intent` or `Task`.
- No abbreviations in public API names.
- Prefer value types. Reference types need a reason.
- Force-unwrap is a code-review conversation, and is banned outright in
  `AlarmEngine`.
- Comments explain *why*. The code already says what. A comment restating the
  line below it is deleted on sight.
- Any code implementing ADR-0007 carries a comment pointing at the ADR. That
  mechanism looks simplifiable and must not be simplified by someone in a hurry.
