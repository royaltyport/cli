---
name: royaltyport-sandbox
description: Access Royaltyport project data via the CLI sandbox. Use when working with music royalty contracts, entities, artists, writers, relations, recordings, compositions, or statements.
metadata:
  author: royaltyport
  version: "0.2.0"
---

# Skill: Royaltyport Sandbox

Access Royaltyport project data through the CLI. Upload and download contracts and statements, track processing status, and explore project data stored as YAML files in a sandboxed filesystem.

## Prerequisites

Install the CLI and authenticate:

```bash
npm install -g @royaltyport/cli
```

Set your API token as an environment variable (preferred for agents):

```bash
export ROYALTYPORT_TOKEN=rp_your_token_here
```

Or authenticate interactively:

```bash
royaltyport login
```

## Discovery

### List available projects

```bash
royaltyport projects
```

### Get the full filesystem overview for a project

```bash
royaltyport project info <project_id>
```

This prints the project's AGENTS.md — a detailed breakdown of every directory, file type, and YAML field available in the sandbox.

## Executing Commands

Run bash commands in the sandbox with `project exec`. Commands run with the workspace root as the working directory.

```bash
# Single command
royaltyport project exec <project_id> "ls contracts/"

# Multiple commands in one call (reuses the same sandbox connection)
royaltyport project exec <project_id> "ls contracts/" "cat stats.yaml"

# Run commands in parallel
royaltyport project exec <project_id> "cat stats.yaml" "ls contracts/" --parallel
```

stdout and stderr stream to their respective outputs. The process exits with the last non-zero exit code (or 0 if all succeed).

## Contract Management

### Upload a contract

```bash
# Upload from file
royaltyport contracts upload <project_id> contract.pdf

# Upload with extractions
royaltyport contracts upload <project_id> contract.pdf --extractions extract-royalties,extract-splits,extract-entities

# Upload from base64
royaltyport contracts upload <project_id> --base64 "$BASE64" --file-name contract.pdf
```

Available extractions: `extract-accounting-period`, `extract-assets`, `extract-commitments`, `extract-compensations`, `extract-control-areas`, `extract-costs`, `extract-creative-approvals`, `extract-dates`, `extract-royalties`, `extract-signatures`, `extract-splits`, `extract-targets`, `extract-balances`.

### Check contract processing status

```bash
# Check once
royaltyport contracts status <project_id> <staging_id>

# Watch until staging and extractions complete
royaltyport contracts status <project_id> <staging_id> --watch
```

### List contracts

```bash
royaltyport contracts list <project_id>
royaltyport contracts list <project_id> --page 2 --per-page 50
```

### Download a contract

```bash
royaltyport contracts download <project_id> <contract_id>
royaltyport contracts download <project_id> <contract_id> --output ./downloads/contract.pdf
```

## Statement Management

### Upload a statement

```bash
# Upload from file
royaltyport statements upload <project_id> statement.pdf

# Upload from base64
royaltyport statements upload <project_id> --base64 "$BASE64" --file-name statement.pdf
```

### Check statement processing status

```bash
# Check once
royaltyport statements status <project_id> <staging_id>

# Watch until staging and processing complete
royaltyport statements status <project_id> <staging_id> --watch
```

### List statements

```bash
royaltyport statements list <project_id>
royaltyport statements list <project_id> --page 2 --per-page 50
```

### Download a statement

```bash
royaltyport statements download <project_id> <statement_id>
royaltyport statements download <project_id> <statement_id> --output ./downloads/statement.pdf
```

## Filesystem Layout

```
stats.yaml                              # Record counts for all resource types
contracts/contract_{id}/                 # Per-contract data
  uploaded.yaml                         #   File metadata (id, file_name, file_type)
  extracted/                            #   AI-extracted contract terms
    royalties.yaml, entities.yaml, dates.yaml, control_areas.yaml,
    compensations.yaml, costs.yaml, artists.yaml, writers.yaml,
    recordings.yaml, compositions.yaml, signatures.yaml, splits.yaml,
    accounting_period.yaml, languages.yaml, types.yaml,
    creative_approvals.yaml, targets.yaml, commitments.yaml
  relationships/                        #   Parent/sibling/child links
  statements.yaml                       #   Linked statements
entities/entity_{id}/                   # metadata.yaml, merged.yaml, relations.yaml, artists.yaml, writers.yaml
artists/artist_{id}/                    # metadata.yaml, merged.yaml, entities.yaml
writers/writer_{id}/                    # metadata.yaml, merged.yaml, entities.yaml
relations/relation_{id}/                # metadata.yaml, merged.yaml, entities.yaml
recordings/recording_{id}/              # metadata.yaml, products.yaml, tracks.yaml
compositions/composition_{id}/          # metadata.yaml, products.yaml, tracks.yaml
statements/
  statement_{id}/                       # metadata.yaml, contracts.yaml
  recordings/statement_{id}/assets.yaml # Recording assets (isrc, upc, matched)
  compositions/statement_{id}/assets.yaml # Composition assets (iswc, work_id, matched)
```

## Common Data Access Patterns

### Project overview

```bash
royaltyport project exec $PROJECT_ID "cat stats.yaml"
```

### Find contracts

```bash
# List all contracts
royaltyport project exec $PROJECT_ID "ls contracts/"

# Find contract by name
royaltyport project exec $PROJECT_ID "grep -ril 'CONTRACT_NAME' contracts/contract_*/uploaded.yaml"

# Find contracts involving an entity
royaltyport project exec $PROJECT_ID "grep -ril 'ENTITY_NAME' contracts/contract_*/extracted/entities.yaml"
```

### Read contract details

```bash
# File metadata
royaltyport project exec $PROJECT_ID "cat contracts/contract_{id}/uploaded.yaml"

# Extracted terms
royaltyport project exec $PROJECT_ID "cat contracts/contract_{id}/extracted/royalties.yaml"
royaltyport project exec $PROJECT_ID "cat contracts/contract_{id}/extracted/splits.yaml"
royaltyport project exec $PROJECT_ID "ls contracts/contract_{id}/extracted/"
```

### Find artists, writers, entities

```bash
# Search by name
royaltyport project exec $PROJECT_ID "grep -rl 'SEARCH_TERM' artists/"
royaltyport project exec $PROJECT_ID "grep -rl 'SEARCH_TERM' writers/"
royaltyport project exec $PROJECT_ID "grep -rl 'SEARCH_TERM' entities/"

# List all artist names
royaltyport project exec $PROJECT_ID "grep -rh '^name:' artists/artist_*/metadata.yaml | sort"

# Read artist details
royaltyport project exec $PROJECT_ID "cat artists/artist_{id}/metadata.yaml"
royaltyport project exec $PROJECT_ID "cat artists/artist_{id}/merged.yaml"
```

### Find recordings and compositions

```bash
# Search by name or ISRC/ISWC
royaltyport project exec $PROJECT_ID "grep -rl 'SEARCH_TERM' recordings/"
royaltyport project exec $PROJECT_ID "grep -rl 'ISWC_CODE' compositions/"

# Read recording details
royaltyport project exec $PROJECT_ID "cat recordings/recording_{id}/metadata.yaml"
```

### Browse statements

```bash
# List statements
royaltyport project exec $PROJECT_ID "ls statements/ | head -20"

# Read statement metadata
royaltyport project exec $PROJECT_ID "cat statements/statement_{id}/metadata.yaml"

# Read matched recording assets on a statement
royaltyport project exec $PROJECT_ID "cat statements/recordings/statement_{id}/assets.yaml"
```

### Batch multiple reads

```bash
# Fetch several files in one call
royaltyport project exec $PROJECT_ID \
  "cat stats.yaml" \
  "ls contracts/" \
  "ls statements/"

# Parallel reads for independent data
royaltyport project exec $PROJECT_ID \
  "cat contracts/contract_{id}/extracted/royalties.yaml" \
  "cat contracts/contract_{id}/extracted/entities.yaml" \
  --parallel
```

## Tips

- **Always start with `stats.yaml`** to understand how much data the project has.
- **Use `grep -rl`** for searching across files, `grep -rh` for extracting values.
- **Check `merged.yaml`** — artists, writers, and entities may have duplicates merged into a root record.
- **All data is plain-text YAML** — standard Unix tools (`grep`, `cat`, `find`, `wc`, `sort`, `head`) all work.
- **Contract extractions** under `extracted/` are AI-extracted terms. One YAML file per category.
- **Batch commands** when you need multiple reads — pass multiple quoted commands to `project exec` to avoid repeated sandbox connections.
- **Use `--parallel`** when commands are independent and you want faster results.
