/**
 * MIGRATION SCRIPT: SQLite -> Neon (Postgres)
 * 
 * Usage:
 * 1. Create a .env file and set DATABASE_URL=your_neon_connection_string
 * 2. Run: node scripts/migrate_to_neon.mjs
 */

import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not found in .env');
    process.exit(1);
}

const sqlitePath = path.join(__dirname, '../league.db');
const db = new Database(sqlitePath);
const pgSql = neon(DATABASE_URL);

const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS leagues (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT UNIQUE NOT NULL,
    admin_password TEXT NOT NULL,
    join_password TEXT NOT NULL
  )`,
    `CREATE TABLE IF NOT EXISTS drivers (
    id TEXT PRIMARY KEY,
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT NOT NULL,
    team TEXT,
    total_points INTEGER DEFAULT 0
  )`,
    `CREATE TABLE IF NOT EXISTS races (
    id TEXT PRIMARY KEY,
    league_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    track TEXT,
    race_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_finished BOOLEAN DEFAULT true,
    scheduled_date TIMESTAMP
  )`,
    `CREATE TABLE IF NOT EXISTS race_results (
    id TEXT PRIMARY KEY,
    race_id TEXT,
    driver_id TEXT,
    position INTEGER NOT NULL,
    fastest_lap BOOLEAN DEFAULT false,
    clean_driver BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    is_dnf BOOLEAN DEFAULT false
  )`,
    `CREATE TABLE IF NOT EXISTS points_config (
    league_id TEXT PRIMARY KEY,
    points_json TEXT NOT NULL,
    fastest_lap_bonus INTEGER DEFAULT 2,
    clean_driver_bonus INTEGER DEFAULT 3
  )`
];

async function migrate() {
    console.log('--- Starting Migration: SQLite -> Neon ---');

    console.log('Initializing Schema in Neon...');
    for (const cmd of SCHEMA) {
        await pgSql.query(cmd);
    }

    // 1. Fetch all data from SQLite
    const leagues = db.prepare('SELECT * FROM leagues').all();
    const drivers = db.prepare('SELECT * FROM drivers').all();
    const races = db.prepare('SELECT * FROM races').all();
    const raceResults = db.prepare('SELECT * FROM race_results').all();
    const pointsConfig = db.prepare('SELECT * FROM points_config').all();

    console.log(`Found: ${leagues.length} leagues, ${drivers.length} drivers, ${races.length} races.`);

    // 2. Upload to Neon
    try {
        // Points Config
        if (pointsConfig.length > 0) {
            console.log('Migrating Points Config...');
            for (const pc of pointsConfig) {
                await pgSql.query(`
                    INSERT INTO points_config (league_id, points_json, fastest_lap_bonus, clean_driver_bonus)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (league_id) DO NOTHING
                `, [pc.league_id, pc.points_json, pc.fastest_lap_bonus, pc.clean_driver_bonus]);
            }
        }

        // Leagues
        if (leagues.length > 0) {
            console.log('Migrating Leagues...');
            for (const l of leagues) {
                await pgSql.query(`
                    INSERT INTO leagues (id, created_at, name, admin_password, join_password)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO NOTHING
                `, [l.id, l.created_at, l.name, l.admin_password, l.join_password]);
            }
        }

        // Drivers
        if (drivers.length > 0) {
            console.log('Migrating Drivers...');
            for (const d of drivers) {
                await pgSql.query(`
                    INSERT INTO drivers (id, league_id, created_at, name, team, total_points)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (id) DO NOTHING
                `, [d.id, d.league_id, d.created_at, d.name, d.team, d.total_points]);
            }
        }

        // Races
        if (races.length > 0) {
            console.log('Migrating Races...');
            for (const r of races) {
                await pgSql.query(`
                    INSERT INTO races (id, league_id, created_at, track, race_date, is_finished, scheduled_date)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                `, [r.id, r.league_id, r.created_at, r.track, r.race_date, !!r.is_finished, r.scheduled_date]);
            }
        }

        // Race Results
        if (raceResults.length > 0) {
            console.log('Migrating Race Results...');
            for (const rr of raceResults) {
                await pgSql.query(`
                    INSERT INTO race_results (id, race_id, driver_id, position, fastest_lap, clean_driver, points_earned, is_dnf)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                `, [rr.id, rr.race_id, rr.driver_id, rr.position, !!rr.fastest_lap, !!rr.clean_driver, rr.points_earned, !!rr.is_dnf]);
            }
        }

        console.log('--- Migration Finished Successfully! ---');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
