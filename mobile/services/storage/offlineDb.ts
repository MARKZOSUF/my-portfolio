import * as SQLite from 'expo-sqlite';
let db: SQLite.SQLiteDatabase | undefined;
async function getDb(){ if(!db){db=await SQLite.openDatabaseAsync('studyforge.db'); await db.execAsync(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS queue (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, path TEXT NOT NULL, body TEXT, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS quiz_history (id TEXT PRIMARY KEY, payload TEXT NOT NULL, completed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS flashcard_review (id TEXT PRIMARY KEY, payload TEXT NOT NULL, reviewed_at TEXT NOT NULL);
`);} return db; }
export async function cacheSet(key:string,value:unknown){const d=await getDb();await d.runAsync('INSERT INTO cache(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at',key,JSON.stringify(value),new Date().toISOString());}
export async function cacheGet<T>(key:string):Promise<T|undefined>{const d=await getDb();const row=await d.getFirstAsync<{value:string}>('SELECT value FROM cache WHERE key=?',key);return row?JSON.parse(row.value) as T:undefined;}
export async function enqueue(method:string,path:string,body?:unknown){const d=await getDb();await d.runAsync('INSERT INTO queue(method,path,body,created_at) VALUES(?,?,?,?)',method,path,body?JSON.stringify(body):null,new Date().toISOString());}
export async function pendingQueue(){const d=await getDb();return d.getAllAsync<{id:number;method:string;path:string;body:string|null;attempts:number}>('SELECT * FROM queue ORDER BY id LIMIT 50');}
export async function removeQueued(id:number){const d=await getDb();await d.runAsync('DELETE FROM queue WHERE id=?',id);}
export async function bumpQueued(id:number){const d=await getDb();await d.runAsync('UPDATE queue SET attempts=attempts+1 WHERE id=?',id);}
