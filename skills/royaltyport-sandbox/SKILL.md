---
name: royaltyport-sandbox
description: Access Royaltyport project data via the CLI sandbox. Use when working with music royalty contracts, entities, artists, writers, relations, recordings, compositions, or statements.
metadata:
  author: royaltyport
  version: "0.1.0"
---

# Skill: Royaltyport Sandbox

Access Royaltyport project data through the CLI. All project data is stored as YAML files in a sandboxed filesystem. You execute bash commands against the sandbox — no SDK or API calls needed.

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

Run any bash command in the sandbox with `project exec`. Commands run with the workspace root as the working directory. Use relative paths directly.

```bash
royaltyport project exec <project_id> "<command>"
```

stdout and stderr stream to their respective outputs. The process exits with the command's exit code.

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

## Tips

- **Always start with `stats.yaml`** to understand how much data the project has.
- **Use `grep -rl`** for searching across files, `grep -rh` for extracting values.
- **Check `merged.yaml`** — artists, writers, and entities may have duplicates merged into a root record.
- **All data is plain-text YAML** — standard Unix tools (`grep`, `cat`, `find`, `wc`, `sort`, `head`) all work.
- **Contract extractions** under `extracted/` are AI-extracted terms. One YAML file per category.
