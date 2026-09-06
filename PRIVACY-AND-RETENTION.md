# Privacy and retention

## What is stored

| Data | Purpose | Location |
| --- | --- | --- |
| Email, password hash, verification state | Account access | Postgres |
| Optional academic profile | Personalisation only; never required | Postgres |
| Topics, jobs, notes, evidence, citations | The study material you generate | Postgres |
| Generated PDFs | Download, share, offline copy | Private object storage |
| Fair-use counters | Service protection | Postgres/Redis |

No advertising identifiers, no third-party analytics SDKs, no sale of data.

## Third parties

When an administrator configures a cloud AI provider, the topic and retrieved
source excerpts are sent to that provider to draft notes. Deployments that must
avoid this can use an approved self-hosted model, where no content leaves the
infrastructure. Search providers receive only the generated search queries.

## Retention

Generated PDFs and temporary artifacts are purged after
`GENERATED_FILE_RETENTION_DAYS` (default 90). Notes persist until you delete
them. Deleting a note deletes its stored PDF. Deleting an account removes the
profile, notes, jobs and generated files.

## Your controls

- Export a note as JSON, Markdown, HTML or PDF at any time
- Delete an individual note or its PDF
- Save an offline copy on the device
- Request full account deletion from the privacy endpoints

## Isolation

Every record is scoped to its owner and every read path filters by the
authenticated user id. Owner isolation is covered by tests.
