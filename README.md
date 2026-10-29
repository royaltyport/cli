# @royaltyport/cli

Command-line interface for Royaltyport. Authenticate, browse projects, and execute commands in project sandboxes.

## Documentation

Full CLI reference available at [docs.royaltyport.com/cli-reference](https://docs.royaltyport.com/cli-reference).

## Requirements

- Node.js >= 18.0.0

## Installation

```bash
npm install -g @royaltyport/cli
```

Or install from source:

```bash
git clone https://github.com/royaltyport/royaltyport-cli.git
cd royaltyport-cli
npm install
npm link
```

## Authentication

The CLI supports two authentication methods. **Browser login** is the default and recommended approach. **API tokens** are available for server-side and headless environments.

### Browser login (default)

```bash
royaltyport login
```

Opens your browser where you sign in to Royaltyport and approve access via OAuth. Tokens are received automatically and stored locally — nothing to copy or paste. Sessions are refreshed automatically.

### API token login

For CI/CD, automation, or environments without a browser, pass an API token directly:

```bash
royaltyport login --token rp_your_token_here
```

Tokens are created in **Organizations > Settings > Tokens** in the Royaltyport platform.

### Environment variables

For CI/CD or AI agent integrations, set these environment variables instead of running `login`:

| Variable             | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `ROYALTYPORT_TOKEN`  | API token — overrides stored credentials                 |
| `ROYALTYPORT_API_URL`| Custom API base URL (default: `https://api.royaltyport.com`) |

### Custom API URL

```bash
royaltyport login --api-url https://your-api-url.com
```

### Logout

```bash
royaltyport logout
```

## Commands

### `royaltyport projects`

List all accessible projects.

```bash
royaltyport projects
```

### `royaltyport projects create <name>`

Create a project as an organization admin.

```bash
royaltyport projects create "New Catalog" --entity-name "Label BV"
```

```
ID                                     Name                Created
─────────────────────────────────────  ──────────────────  ──────────
a1b2c3d4-...                           Record Label Ltd    1/15/2025
e5f6g7h8-...                           Publishing Co       3/22/2025
```

### `royaltyport project info <project_id>`

Display the AGENTS.md from the project sandbox — a filesystem overview with instructions for navigating project data.

```bash
royaltyport project info a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### `royaltyport project exec <project_id> <commands...>`

Execute one or more bash commands in the project sandbox. Commands run with the sandbox workspace root as the working directory.

```bash
# Single command
royaltyport project exec $PROJECT_ID "ls contracts/"

# Multiple commands in one call (faster — reuses the same sandbox connection)
royaltyport project exec $PROJECT_ID "ls contracts/" "cat stats.yaml"

# Search for an entity by name
royaltyport project exec $PROJECT_ID "grep -rl 'Sony Music' entities/"

# Read a contract's extracted royalties
royaltyport project exec $PROJECT_ID "cat contracts/contract_123/extracted/royalties.yaml"
```

stdout and stderr are written to their respective streams, and the process exits with the last non-zero exit code (or 0 if all succeed) — making it suitable for scripting and AI agent tool use.

### `royaltyport knowledge search <project_id> <query>`

Search governed organization knowledge that is organization-wide or applicable to a project.

```bash
royaltyport knowledge search $PROJECT_ID "distribution approval policy" --limit 5
```

Results include matching graph nodes, claim and relationship counts, and the latest indexing timestamp.

### `royaltyport contracts upload <project_id> [file_path]`

Upload a contract PDF to a project. PDF only, max 50 MB. The upload runs as a three-step
signed-URL flow (there is no upload progress percentage); server-side processing continues
after the command returns — track it with `contracts status --watch`.

```bash
# Upload from file
royaltyport contracts upload $PROJECT_ID contract.pdf

# Upload with extractions
royaltyport contracts upload $PROJECT_ID contract.pdf --extractions extract-language,extract-royalties,extract-splits

# Upload with approved folder and tag metadata. Existing exact tag names are
# reused; missing project contract tags are created automatically.
royaltyport contracts upload $PROJECT_ID contract.pdf \
  --folder "Ocean Wave/Agreements" \
  --tags "Priority,Artist agreement"

# Upload from base64
royaltyport contracts upload $PROJECT_ID --base64 "$BASE64" --file-name contract.pdf
```

### `royaltyport contracts complete <project_id> <staging_id>`

Re-run upload finalization when an upload failed after the file bytes were already stored
(the error message will point here). Does not re-upload the file.

```bash
royaltyport contracts complete $PROJECT_ID $STAGING_ID
```

### `royaltyport contracts status <project_id> <staging_id>`

Check processing status for a contract.

```bash
# Check once
royaltyport contracts status $PROJECT_ID $STAGING_ID

# Watch until complete
royaltyport contracts status $PROJECT_ID $STAGING_ID --watch
royaltyport contracts status $PROJECT_ID $STAGING_ID --watch --timeout 900
```

### `royaltyport contracts list <project_id>`

List contracts in a project.

```bash
royaltyport contracts list $PROJECT_ID
royaltyport contracts list $PROJECT_ID --page 2 --per-page 50
royaltyport contracts list $PROJECT_ID --score
royaltyport contracts list $PROJECT_ID --extractor-ids 201,202
```

When `--extractor-ids` is provided, the table includes each matching custom
result with `id`, `internal_uuid`, `created_at`, `updated_at`, `extractor_id`,
`extractor_name`, and extracted `data`.

### `royaltyport contracts get <project_id> <contract_id>`

Get one contract by numeric ID or internal UUID.

```bash
royaltyport contracts get $PROJECT_ID $CONTRACT_ID
```

### `royaltyport contracts extractions <project_id> <contract_id> <key>`

#### Paginated extraction

For a large or complete extraction collection, use this command from page 1.
It supports every extraction key, defaults to 100 items per page, and accepts up
to 250:

```bash
royaltyport contracts extractions $PROJECT_ID $CONTRACT_ID recordings
royaltyport contracts extractions $PROJECT_ID $CONTRACT_ID compositions --page 2 --per-page 250
royaltyport contracts extractions $PROJECT_ID $CONTRACT_ID commitments --citations --json
```

With `--json`, the pagination envelope contains `items`, `total_count`, `page`,
and `per_page`. Payment extractions use the public key `compensations`. Only the
top-level extraction collection is paginated; nested arrays remain attached to
each item and are not independently capped or paginated.

### `royaltyport contracts update <project_id> <contract_id>`

Replace the complete contract tag list. Missing project contract tags are
created automatically; use `--clear-tags` to remove every tag.

```bash
royaltyport contracts update $PROJECT_ID $CONTRACT_ID --tags "Priority,Artist agreement"
royaltyport contracts update $PROJECT_ID $CONTRACT_ID --clear-tags
```

### Contract staging recovery

`status --watch` stops when an upload is paused and prints the applicable next
command. Capacity pauses can be retried.

```bash
royaltyport contracts resolve $PROJECT_ID $STAGING_ID \
  --pause-id PAUSE_UUID --action retry --idempotency-key retry-decision-1
```

### `royaltyport contracts download <project_id> <contract_id>`

Download a contract file.

```bash
royaltyport contracts download $PROJECT_ID $CONTRACT_ID
royaltyport contracts download $PROJECT_ID $CONTRACT_ID --output ./downloads/contract.pdf
```

### `royaltyport statements upload <project_id> [file_path]`

Upload a statement file to a project. Supported files match the platform statement stager:
`.csv`, `.tsv`, `.tab`, `.txt`, `.cat`, `.roy`, `.crd`, `.prt`, `.p01`, `.gdf`, `.021`,
`.030`, `.303`, `.xlsx`, `.xltx`, `.xlsm`, `.xls`, `.xlsb`, `.ods`, `.xml`, `.gz`, `.pdf`,
`.asc`, `.dat`, `.cp9385146`, and extensionless sources. The maximum size is 50 MB.
The upload runs as a three-step
signed-URL flow (there is no upload progress percentage); server-side processing continues
after the command returns — track it with `statements status --watch`.

```bash
royaltyport statements upload $PROJECT_ID statement.pdf

# Upload with approved staging context and start processing immediately
royaltyport statements upload $PROJECT_ID statement.pdf \
  --folder "Ocean Wave/2026/Q1" \
  --accounting-period 2026Q1 \
  --target-period 2026Q1 \
  --royalty-currency GBP \
  --transaction-currency USD \
  --payee "Ocean Wave Records Ltd" \
  --payor "Absolute Marketing & Distribution Ltd" \
  --scenario-family distribution.general \
  --target-family recording_distribution \
  --tags "Priority,Quarterly"

# Upload from base64
royaltyport statements upload $PROJECT_ID --base64 "$BASE64" --file-name statement.pdf
```

Supplying a folder or any context flag seals the metadata and skips review; the
upload result is `queued` or `paused` and prints the immutable snapshot and
queue counts. Context-free uploads remain `uploaded`.

Periods are value-only and use `2026M1`–`2026M12`, `2026Q1`–`2026Q4`,
`2026H1`/`2026H2`, or `2026Y`. Tags are names rather than IDs; matching tags
are reused and missing tags are created automatically.

### `royaltyport statements complete <project_id> <staging_id>`

Re-run upload finalization when an upload failed after the file bytes were already stored
(the error message will point here). Does not re-upload the file.

```bash
royaltyport statements complete $PROJECT_ID $STAGING_ID
```

### `royaltyport statements status <project_id> <staging_id>`

Check processing status for a statement.

```bash
royaltyport statements status $PROJECT_ID $STAGING_ID
royaltyport statements status $PROJECT_ID $STAGING_ID --watch
royaltyport statements status $PROJECT_ID $STAGING_ID --watch --timeout 900
```

### `royaltyport statements list <project_id>`

List statements in a project.

```bash
royaltyport statements list $PROJECT_ID
royaltyport statements list $PROJECT_ID --page 2 --per-page 50
royaltyport statements list $PROJECT_ID --score
```

### `royaltyport statements update <project_id> <statement_id>`

Patch statement tags, parties, periods, or currencies. Omitted fields remain
unchanged. Each nullable field has a matching `--clear-*` option.

```bash
royaltyport statements update $PROJECT_ID $STATEMENT_ID \
  --tags "Priority,Quarterly" \
  --payee "Ocean Wave Records Ltd" \
  --accounting-period 2026Q1 \
  --transaction-currency USD \
  --royalty-currency GBP

royaltyport statements update $PROJECT_ID $STATEMENT_ID \
  --clear-payee \
  --clear-target-period \
  --clear-tags
```

Retry a statement paused at the project document limit:

```bash
royaltyport statements resolve $PROJECT_ID $STAGING_ID \
  --pause-id PAUSE_UUID --action retry --idempotency-key retry-decision-1
```

### `royaltyport statements download <project_id> <statement_id>`

Download a statement file.

```bash
royaltyport statements download $PROJECT_ID $STATEMENT_ID
royaltyport statements download $PROJECT_ID $STATEMENT_ID --output ./downloads/statement.pdf
```

### `royaltyport tags list <project_id> <scope>`

List contract or statement tag definitions with usage counts.

```bash
royaltyport tags list $PROJECT_ID contracts
royaltyport tags list $PROJECT_ID statements --search priority --page 1 --per-page 100
```

### `royaltyport tags update <project_id> <scope> <resource_id>`

Replace the complete tag list of a numeric contract or statement ID.

```bash
royaltyport tags update $PROJECT_ID contracts $CONTRACT_ID --tags "Priority,Artist agreement"
royaltyport tags update $PROJECT_ID statements $STATEMENT_ID --clear-tags
```

## Agent Skill

This repo includes a [skills.sh](https://skills.sh/)-compatible skill that teaches AI agents how to use the CLI to explore and query Royaltyport project data.

Install it into your agent:

```bash
npx skills add royaltyport/royaltyport-cli
```

The skill covers authentication, project discovery, filesystem layout, and common data access patterns — everything an agent needs to send the right `project exec` commands.

## Configuration

Credentials and settings are stored at `~/.config/royaltyport/config.json` (managed by [conf](https://github.com/sindresorhus/conf)). Running `royaltyport logout` clears this file.
## License

UNLICENSED


### Resolve a paused document

The document-resolution endpoints are additive and require the matching API update.
Read processing status first and submit its current `pause.id` (or `pause_id`).
Use one stable idempotency key per decision. If a request times out, retry the
same key and payload; a different payload under that key returns HTTP 409.
HTTP 202 means accepted for background dispatch; HTTP 200 can mean capacity
is still full. Continue reading `/ingestion` using source-wide `status`,
`terminal`, and `poll_after_seconds`. A paused or unknown source is not a signal
to poll forever. Submit only actions advertised by the current pause.

```bash
royaltyport contracts resolve PROJECT_ID STAGING_ID \
  --pause-id PAUSE_UUID --action retry \
  --idempotency-key juniper-capacity-decision-1 --json

royaltyport statements resolve PROJECT_ID STAGING_ID \
  --pause-id PAUSE_UUID --action retry \
  --idempotency-key juniper-statement-decision-1 --json

royaltyport contracts resolve PROJECT_ID STAGING_ID \
  --pause-id PAUSE_UUID --action approve_split \
  --idempotency-key juniper-split-decision-1 \
  --input-file split-input.json --json
```

`split-input.json` contains the `input` object, not the full request body.
Split input accepts 1–128 agreements, with at least one selected for processing:

```json
{
  "agreements": [
    { "title": "Recording agreement", "start_page": 1, "end_page": 4, "process": true },
    { "title": "Publishing agreement", "start_page": 5, "end_page": 8, "process": true }
  ]
}
```

Alternatively pass that object with `--input-json`. Retry takes an empty object
and needs neither input flag. `--json` includes response decision metadata.
The command sends one request; after an ambiguous network failure, rerun the
same command with the same key and payload. `status --watch` respects the
source-wide completion state instead of stopping when only one split child
has finished.

## Fixed API release

This CLI supports only `2026-10-20.birch`. The API release is independent of the
package version (`--version`) and HTTP namespace (`/v1`). Every request, retry
and poll sends the exact `Royaltyport-Version` header and checks the response.
Signed Storage transfers receive neither API credentials nor the release header.

```bash
royaltyport api-version
# 2026-10-20.birch
```

There is no release selector, saved API-version preference or environment override.
`api-version` is read-only. Document status commands always use `/ingestion`;
capacity/split recovery uses `resolve` with the current pause and a stable key.
The API server's support for other releases is independent of these clients.

### Birch processing responses

Birch uses `status` and source-wide `terminal`, `resources[]`, per-document
`document_processes[]`, and `pause.actions`. The CLI displays each resulting
document's progress. Use `resolve` with the current pause UUID and an idempotency key. An old frozen acceptance
response can return `resolution_response_contract_changed`; poll its existing
status URL instead of creating another decision.


### Hosted integration environment

Client CI uses the GitHub `Staging` environment. Configure its `ROYALTYPORT_TEST_BASE_URL`
and `ROYALTYPORT_TEST_PROJECT_ID` variables and its `ROYALTYPORT_TEST_API_KEY` and
`ROYALTYPORT_TEST_PROTECTION_BYPASS` secrets. The API key is scoped to a synthetic
Staging project. Tests refuse missing configuration, Production targets and hosted
loopback fallbacks. Protection credentials are sent only to the Staging API origin;
Storage transfers receive no API credentials. Local integration tests require explicit
loopback URL, project and key. No Production fixture is a default.


## Check downstream processing and reader readiness

Use the Agents commands after ingestion creates a canonical contract or statement. Pass the ID from `resources[]`; keep the upload’s staging ID for status polling.

Read a resource’s downstream state:

```bash
royaltyport contracts agents project_uuid 123
royaltyport statements agents project_uuid 456
```

Each command prints the full response. `agent_runs` summarizes processing runs; `agent_readiness` identifies current outputs. A completed run alone does not prove reader readiness. Statement readiness reports processing milestones; it does not promise Data Room serving.

When contract recordings or compositions are ready, use their `revision` on every page:

```bash
royaltyport contracts extractions project_uuid 123 recordings \
  --expected-revision readiness_revision --page 1 --per-page 100 --json
```

Conditional JSON output includes `meta.revision`. If the API returns `409 readiness_changed`, fetch Agents again before restarting pagination. Check `quality.issues` for metadata limitations even when readiness is `ready`.

Filter runs, reuse the returned cursor, or inspect one run’s steps:

```bash
royaltyport agents runs project_uuid --resource-type contract --resource-id 123
royaltyport agents runs project_uuid --resource-type contract --resource-id 123 \
  --cursor next_cursor
royaltyport agents run project_uuid run_uuid
```

Run lists retain `data`, `meta.has_more`, `meta.next_cursor` and `links.next`. Keep the same project, filters and limit when reusing a cursor. Available filters are `--resource-type`, `--resource-id`, `--process-key`, `--status` and `--limit`.

Agents commands and `--expected-revision` use the fixed Birch contract.

Birch contract ingestion returns `staging_split_processes` and `staging_split_manifest`, replacing `intermediate_processes` and `split_manifest`. Resulting resources include `links.agents`.


## Navigation and recoverable API conflicts

`contracts extractions --json` retains its paginated data output; conditional
reads still include the envelope and `meta.revision`. Use `--envelope` to get
`data`, `meta` and `links.self`/`links.next` for any extraction request. The API
links preserve project scope, citations, page size and the supplied revision.

Upload and complete commands show `status: uploaded` separately from
`processing_status`. A null admission value means this confirmation performed no
new admission; poll the displayed processing URL for live state. Document Usage
is the counted capacity, not remaining capacity; unavailable values stay unknown.

For `readiness_changed`, inspect the displayed Agents URL before restarting
pagination. For `resolution_response_contract_changed`, poll the existing
processing URL and retain the displayed decision reference and original
idempotency key. The CLI displays recovery guidance without issuing a mutation.
