# Changelog

## Next release

- Contract and statement status commands poll `/ingestion` under Birch. Explicit Aster selection continues to use `/processes`; command names and watch behavior are unchanged.


## 1.0.0

CLI 1.0 defaults to API release `2026-10-20.birch`. The API date and CLI package
version are independent.

### Breaking changes

- The default processing response uses Birch's `status`, `terminal`,
  `resources[]`, `document_processes[]`, and nested `pause.actions`. Scripts
  reading the retired Aster fields must migrate or select Aster explicitly.
- Birch status commands require the original upload's staging ID. Canonical
  document IDs are not a fallback for the processing source.
- Admission `retry` is Aster-only. On Birch, use `resolve` with the current
  pause UUID and a stable idempotency key. Capacity details use `usage_meter`
  and `usage_limit`.

### Additions

- Select the API release with `--api-version`, then
  `ROYALTYPORT_API_VERSION`, then the saved profile, in that precedence.
  Requests stay pinned through token refresh, polling and retries.
- Status output shows every resulting document. Watch mode waits for the
  source-wide terminal state, including split documents.
- Pause-bound resolution supports stable decision replay. If an old frozen
  reply returns `resolution_response_contract_changed`, poll its existing
  status URL rather than creating another decision.
- Signed Storage transfers receive neither API credentials nor release headers.

### Upgrade from 0.10

Install `@royaltyport/cli@1.0.0`. To retain Aster behavior for existing scripts:

```sh
export ROYALTYPORT_API_VERSION=2026-04-20.aster
```

Otherwise migrate JSON processing readers to Birch before using the new default.
