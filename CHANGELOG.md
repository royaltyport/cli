# Changelog

## 3.0.0 (2026-10-30)

### Breaking changes

- Support only the fixed `2026-10-20.birch` contract. Remove Aster selection,
  the API-version flag/environment/profile setting, standalone staging retry,
  embedded extraction includes and singleton processing response types/rendering.
- `api-version` now reports the pin and takes no arguments. Use pause-bound
  `resolve` and dedicated paginated `contracts extractions` instead.

### API parity

- Add `contracts extractions --envelope` without changing existing JSON formats.
- Show upload admission/capacity/polling links separately from upload confirmation.
- Retain and display readiness/decision recovery details without retrying conflicts.

- Refresh security-sensitive test and build dependencies; preserve Node 18 runtime support.
- Update the runtime configuration URI parser to its patched release.

### Upgrade from 2.0

- Remove `--api-version` and `ROYALTYPORT_API_VERSION` from scripts. The CLI
  always uses `2026-10-20.birch`; existing saved release preferences are ignored.
  Run `royaltyport api-version` to inspect the fixed release.
- Replace standalone staging retry commands with `contracts resolve` or
  `statements resolve`, using the observed pause UUID, advertised action and a
  stable idempotency key. Keep the staging ID returned by upload for polling.
- Replace embedded extraction includes with
  `contracts extractions PROJECT_ID CONTRACT_ID KEY`. Add `--envelope` when
  consuming navigation links and metadata; existing `--json` output stays intact.
- Update processing-response readers to Birch's source-wide `terminal`,
  `resources`, `document_processes` and `pause.actions` fields. Aster singleton
  processing fields and `/processes` support have been removed from this client.


## 2.0.0

- Use dedicated contract extraction reads in Birch; unsupported embedded reads fail before authentication or network work.
- Downstream filters accept the API process keys `contract-deduplication` and `contract-repair`.

- Add `contracts agents`, `statements agents`, `agents runs` and `agents run` for downstream readiness and run inspection. Run lists preserve cursor metadata and links.
- Add `--expected-revision` to contract extractions. Conditional `--json` output includes the verified `meta.revision`.
- Reject Agents and conditional reader requests under Aster before authentication or network access. Existing Aster status commands retain `/processes`.
- Update Birch ingestion types to `staging_split_processes`, `staging_split_manifest` and `resources[].links.agents`, without aliases for the earlier Birch split fields.

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
