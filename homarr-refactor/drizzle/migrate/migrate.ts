// This file is used to migrate the database to the current version
// It is run when the docker container starts
const Database = require('better-sqlite3');
const path = require('path');
const dotenv = require('dotenv');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { migrate } = require('drizzle-orm/better-sqlite3/migrator');

const migrationsFolder = process.argv[2] ?? '../drizzle';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL ?? 'file:./database/db.sqlite';
const sqlitePath = databaseUrl.startsWith('file:') ? databaseUrl.replace('file:', '') : databaseUrl;
const sqlite = new Database(sqlitePath);

const db = drizzle(sqlite);

const migrateDatabase = async () => {
  await migrate(db, { migrationsFolder });
};

migrateDatabase();
