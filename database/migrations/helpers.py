from alembic import op
from sqlalchemy import inspect,text
def ensure():
 if not inspect(op.get_bind()).has_table('schema_migration_adoptions'):op.execute("CREATE TABLE schema_migration_adoptions(revision varchar(64) NOT NULL,table_name varchar(128) NOT NULL,preexisting boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(revision,table_name))")
def create(revision,name,ddl):
 ensure();pre=inspect(op.get_bind()).has_table(name);op.execute(ddl);op.get_bind().execute(text("INSERT INTO schema_migration_adoptions(revision,table_name,preexisting) VALUES(:r,:t,:p) ON CONFLICT DO NOTHING"),{'r':revision,'t':name,'p':pre})
def drop(revision,name):
 ensure();row=op.get_bind().execute(text("SELECT preexisting FROM schema_migration_adoptions WHERE revision=:r AND table_name=:t"),{'r':revision,'t':name}).first()
 if row and row[0] is False and inspect(op.get_bind()).has_table(name):op.execute(f'DROP TABLE {name} CASCADE')
 op.get_bind().execute(text("DELETE FROM schema_migration_adoptions WHERE revision=:r AND table_name=:t"),{'r':revision,'t':name})
