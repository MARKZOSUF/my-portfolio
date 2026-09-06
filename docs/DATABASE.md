# Database architecture

All tenant records carry an owner or parent chain to an owner. API authorization remains mandatory. Foreign keys use restrictive or cascading deletion according to lifecycle. AI quota reservation uses a PostgreSQL advisory transaction lock. Job events use a database sequence. Vector data records provider/model/dimension/version metadata. High-volume lists are bounded and cursor/range based.
