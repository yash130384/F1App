#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'league.db');

const db = new Database(dbPath);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🏁 F1 Telemetrie-Datenbankverifikation (league.db)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Überprüfe Telemetrie-Sessions
console.log('🔍 Überprüfe Telemetrie-Sessions...\n');
const sessions = db.prepare(`
  SELECT 
    id,
    league_id,
    track_id,
    track_length,
    session_type,
    is_active,
    track_flags,
    pit_entry,
    pit_exit,
    created_at
  FROM telemetry_sessions
  ORDER BY created_at DESC
  LIMIT 5
`).all();

if (sessions.length === 0) {
  console.log('❌ Keine Sessions gefunden!');
} else {
  for (const session of sessions) {
    console.log(`✅ Session: ${session.id}`);
    console.log(`   Track ID: ${session.track_id} ${session.track_id ? '✓' : '❌'}`);
    console.log(`   Track Length: ${session.track_length} ${session.track_length ? '✓' : '❌'}`);
    console.log(`   Session Type: ${session.session_type} ${session.session_type ? '✓' : '❌'}`);
    console.log(`   Track Flags: ${session.track_flags}`);
    console.log(`   Pit Entry: ${session.pit_entry} ${session.pit_entry ? '✓' : '❌'}`);
    console.log(`   Pit Exit: ${session.pit_exit} ${session.pit_exit ? '✓' : '❌'}`);
    console.log(`   Created: ${session.created_at}\n`);
  }
}

// Überprüfe Telemetrie-Teilnehmer
console.log('🔍 Überprüfe Telemetrie-Teilnehmer...\n');
const participants = db.prepare(`
  SELECT 
    p.id,
    p.session_id,
    p.game_name,
    p.team_id,
    p.position,
    p.car_index,
    p.is_human,
    p.steering_assist,
    p.braking_assist,
    p.gearbox_assist,
    p.traction_control,
    p.anti_lock_brakes,
    p.visual_tyre_compound,
    p.actual_tyre_compound
  FROM telemetry_participants p
  ORDER BY p.created_at DESC
  LIMIT 10
`).all();

if (participants.length === 0) {
  console.log('❌ Keine Teilnehmer gefunden!');
} else {
  for (const participant of participants) {
    const missingFields = [];
    if (!participant.game_name) missingFields.push('game_name');
    if (participant.team_id === null) missingFields.push('team_id');
    if (participant.position === null) missingFields.push('position');
    if (participant.car_index === null) missingFields.push('car_index');
    if (participant.is_human === null) missingFields.push('is_human');

    const status = missingFields.length === 0 ? '✅' : '⚠️';
    console.log(`${status} Teilnehmer: ${participant.game_name} (Car #${participant.car_index})`);
    console.log(`   Session: ${participant.session_id}`);
    console.log(`   Position: ${participant.position}`);
    console.log(`   Is Human: ${participant.is_human}`);
    console.log(`   Team ID: ${participant.team_id}`);
    console.log(`   Steering Assist: ${participant.steering_assist}`);
    console.log(`   Braking Assist: ${participant.braking_assist}`);
    console.log(`   Gearbox Assist: ${participant.gearbox_assist}`);
    console.log(`   Traction Control: ${participant.traction_control}`);
    console.log(`   Anti-Lock Brakes: ${participant.anti_lock_brakes}`);
    console.log(`   Visual Tyre: ${participant.visual_tyre_compound} ${participant.visual_tyre_compound ? '✓' : '❌'}`);
    console.log(`   Actual Tyre: ${participant.actual_tyre_compound} ${participant.actual_tyre_compound ? '✓' : '❌'}`);

    if (missingFields.length > 0) {
      console.log(`   ❌ Leere Felder: ${missingFields.join(', ')}`);
    }
    console.log();
  }
}

// Überprüfe Telemetrie-Runden
console.log('🔍 Überprüfe Telemetrie-Runden...\n');
const laps = db.prepare(`
  SELECT 
    l.id,
    l.participant_id,
    l.lap_number,
    l.lap_time_ms,
    l.is_valid,
    l.tyre_compound,
    l.sector1_ms,
    l.sector2_ms,
    l.sector3_ms,
    p.game_name,
    s.session_type
  FROM telemetry_laps l
  JOIN telemetry_participants p ON l.participant_id = p.id
  JOIN telemetry_sessions s ON p.session_id = s.id
  ORDER BY l.created_at DESC
  LIMIT 20
`).all();

if (laps.length === 0) {
  console.log('❌ Keine Runden gefunden!');
} else {
  let validCount = 0;
  let invalidCount = 0;

  for (const lap of laps) {
    const missingFields = [];
    if (!lap.lap_time_ms) missingFields.push('lap_time_ms');
    if (lap.tyre_compound === null) missingFields.push('tyre_compound');
    if (lap.sector1_ms === null) missingFields.push('sector1_ms');
    if (lap.sector2_ms === null) missingFields.push('sector2_ms');
    if (lap.sector3_ms === null) missingFields.push('sector3_ms');

    if (missingFields.length === 0) {
      validCount++;
    } else {
      invalidCount++;
    }

    const status = missingFields.length === 0 ? '✅' : '⚠️';
    console.log(`${status} Lap ${lap.lap_number}: ${lap.game_name} - ${lap.lap_time_ms}ms`);
    console.log(`   Tyre: ${lap.tyre_compound} ${lap.tyre_compound ? '✓' : '❌'}`);
    console.log(`   S1: ${lap.sector1_ms}ms ${lap.sector1_ms ? '✓' : '❌'}, S2: ${lap.sector2_ms}ms ${lap.sector2_ms ? '✓' : '❌'}, S3: ${lap.sector3_ms}ms ${lap.sector3_ms ? '✓' : '❌'}`);
    console.log(`   Valid: ${lap.is_valid}`);

    if (missingFields.length > 0) {
      console.log(`   ❌ Leere Felder: ${missingFields.join(', ')}`);
    }
  }

  console.log(`\n   Summary: ${validCount} ✓ | ${invalidCount} ✗`);
}

// Überprüfe Speed Traps
console.log('\n🔍 Überprüfe Speed Traps...\n');
const speedTraps = db.prepare(`
  SELECT 
    st.id,
    st.speed,
    st.lap_number,
    st.distance,
    p.game_name
  FROM telemetry_speed_traps st
  JOIN telemetry_participants p ON st.participant_id = p.id
  ORDER BY st.created_at DESC
  LIMIT 10
`).all();

if (speedTraps.length === 0) {
  console.log('❌ Keine Speed Traps gefunden!');
} else {
  for (const trap of speedTraps) {
    console.log(`✅ Speed Trap: ${trap.game_name} - ${trap.speed.toFixed(2)} km/h`);
    console.log(`   Lap: ${trap.lap_number}, Distance: ${trap.distance}`);
  }
}

// Überprüfe Sector-Daten Aggregation
console.log('\n🔍 Überprüfe Sector-Daten Aggregation...\n');
const sectorStats = db.prepare(`
  SELECT 
    COUNT(*) as total_laps,
    SUM(CASE WHEN sector1_ms IS NOT NULL THEN 1 ELSE 0 END) as sector1_filled,
    SUM(CASE WHEN sector2_ms IS NOT NULL THEN 1 ELSE 0 END) as sector2_filled,
    SUM(CASE WHEN sector3_ms IS NOT NULL THEN 1 ELSE 0 END) as sector3_filled,
    COUNT(*) - SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as invalid_laps
  FROM telemetry_laps
`).get();

console.log(`   Gesamt Runden: ${sectorStats.total_laps}`);
console.log(`   Sector 1 gefüllt: ${sectorStats.sector1_filled}/${sectorStats.total_laps} ${sectorStats.sector1_filled === sectorStats.total_laps ? '✅' : '⚠️'}`);
console.log(`   Sector 2 gefüllt: ${sectorStats.sector2_filled}/${sectorStats.total_laps} ${sectorStats.sector2_filled === sectorStats.total_laps ? '✅' : '⚠️'}`);
console.log(`   Sector 3 gefüllt: ${sectorStats.sector3_filled}/${sectorStats.total_laps} ${sectorStats.sector3_filled === sectorStats.total_laps ? '✅' : '⚠️'}`);
console.log(`   Ungültige Runden: ${sectorStats.invalid_laps}`);

// Überprüfe Assist-Einstellungen Aggregation
console.log('\n🔍 Überprüfe Assist-Einstellungen...\n');
const assistStats = db.prepare(`
  SELECT 
    COUNT(*) as total_participants,
    SUM(CASE WHEN steering_assist IS NOT NULL THEN 1 ELSE 0 END) as steering_filled,
    SUM(CASE WHEN braking_assist IS NOT NULL THEN 1 ELSE 0 END) as braking_filled,
    SUM(CASE WHEN gearbox_assist IS NOT NULL THEN 1 ELSE 0 END) as gearbox_filled,
    SUM(CASE WHEN traction_control IS NOT NULL THEN 1 ELSE 0 END) as tc_filled,
    SUM(CASE WHEN anti_lock_brakes IS NOT NULL THEN 1 ELSE 0 END) as alb_filled
  FROM telemetry_participants
`).get();

console.log(`   Gesamt Teilnehmer: ${assistStats.total_participants}`);
console.log(`   Steering Assist: ${assistStats.steering_filled}/${assistStats.total_participants} ${assistStats.steering_filled === assistStats.total_participants ? '✅' : '⚠️'}`);
console.log(`   Braking Assist: ${assistStats.braking_filled}/${assistStats.total_participants} ${assistStats.braking_filled === assistStats.total_participants ? '✅' : '⚠️'}`);
console.log(`   Gearbox Assist: ${assistStats.gearbox_filled}/${assistStats.total_participants} ${assistStats.gearbox_filled === assistStats.total_participants ? '✅' : '⚠️'}`);
console.log(`   Traction Control: ${assistStats.tc_filled}/${assistStats.total_participants} ${assistStats.tc_filled === assistStats.total_participants ? '✅' : '⚠️'}`);
console.log(`   Anti-Lock Brakes: ${assistStats.alb_filled}/${assistStats.total_participants} ${assistStats.alb_filled === assistStats.total_participants ? '✅' : '⚠️'}`);

// Überprüfe Typen-Compounds
console.log('\n🔍 Überprüfe Tyre-Compounds...\n');
const tyreStats = db.prepare(`
  SELECT 
    COUNT(*) as total_participants,
    SUM(CASE WHEN visual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as visual_filled,
    SUM(CASE WHEN actual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as actual_filled
  FROM telemetry_participants
`).get();

console.log(`   Gesamt Teilnehmer: ${tyreStats.total_participants}`);
console.log(`   Visual Tyre Compound: ${tyreStats.visual_filled}/${tyreStats.total_participants} ${tyreStats.visual_filled === tyreStats.total_participants ? '✅' : '⚠️'}`);
console.log(`   Actual Tyre Compound: ${tyreStats.actual_filled}/${tyreStats.total_participants} ${tyreStats.actual_filled === tyreStats.total_participants ? '✅' : '⚠️'}`);

// Überprüfe CarSetups
console.log('\n🔍 Überprüfe Car Setups...\n');
const setupStats = db.prepare(`
  SELECT 
    COUNT(*) as total_setups,
    COUNT(DISTINCT participant_id) as participants_with_setups
  FROM telemetry_car_setups
`).get();

if (setupStats.total_setups === 0) {
  console.log('❌ Keine Car Setups gefunden!');
} else {
  console.log(`✅ Car Setups: ${setupStats.total_setups} Einträge für ${setupStats.participants_with_setups} Teilnehmer`);
}

// Überprüfe TyreSets
console.log('\n🔍 Überprüfe Tyre Sets...\n');
const tyreSetsStats = db.prepare(`
  SELECT 
    COUNT(*) as total_tyre_sets,
    COUNT(DISTINCT participant_id) as participants_with_tyres
  FROM telemetry_tyre_sets
`).get();

if (tyreSetsStats.total_tyre_sets === 0) {
  console.log('⚠️  Keine Tyre Sets gefunden!');
} else {
  console.log(`✅ Tyre Sets: ${tyreSetsStats.total_tyre_sets} Einträge für ${tyreSetsStats.participants_with_tyres} Teilnehmer`);
}

db.close();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  ✅ Verifikation abgeschlossen');
console.log('═══════════════════════════════════════════════════════════════\n');

