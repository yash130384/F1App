#!/usr/bin/env node
import Database from 'better-sqlite3';

const db = new Database('league.db');

console.log('Spaltennamen in telemetry_participants:');
const cols = db.prepare("PRAGMA table_info(telemetry_participants)").all();
cols.forEach(c => console.log(`  ${c.name}`));

db.close();

