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
royaltyport contracts upload $PROJECT_ID contract.pdf --extractions extract-royalties,extract-splits

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
result with its `extractor_id`, `extractor_name`, and extracted `data`.

### Contract staging recovery

`status --watch` stops when an upload is paused and prints the applicable next
command. Capacity pauses can be retried.

```bash
royaltyport contracts retry $PROJECT_ID $STAGING_ID
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

Retry a statement paused at the project document limit:

```bash
royaltyport statements retry $PROJECT_ID $STAGING_ID
```

### `royaltyport statements download <project_id> <statement_id>`

Download a statement file.

```bash
royaltyport statements download $PROJECT_ID $STATEMENT_ID
royaltyport statements download $PROJECT_ID $STATEMENT_ID --output ./downloads/statement.pdf
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
