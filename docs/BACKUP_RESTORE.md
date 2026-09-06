# Backup and restore

Run `scripts/backup_postgres.sh` with `DATABASE_URL` and a durable `BACKUP_DIR`. It creates a custom-format dump, verifies its catalog, writes SHA-256, and expires old dumps. Restore only into an approved target with `scripts/restore_postgres.sh dump`; it verifies checksum, restores, upgrades migrations, and verifies the schema. Default database RPO is 24 hours when scheduled daily; target RTO is 4 hours, subject to dataset size. Object-store versioning and lifecycle replication must be configured in the selected S3 service. A restore was not executable in this sandbox.
