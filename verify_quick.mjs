#!/usr/bin/env node

// Direktes Testen mit einfachen SQL-Befehlen
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runQuery(sql) {
  try {
    const { stdout, stderr } = await execAsync(`sqlite3 "C:\\Users\\der_b\\Desktop\\F1App\\league.db" "${sql}"`);
    if (stderr) console.error('Error:', stderr);
    return stdout.trim();
  } catch (error) {
    console.error('Exec error:', error.message);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🏁 F1 Telemetrie-Datenbankverifikation (Kurz-Test)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Zähle Sessions
  const sessionCount = await runQuery('SELECT COUNT(*) FROM telemetry_sessions;');
  console.log(`✅ Sessions: ${sessionCount}`);

  // Zähle Teilnehmer
  const participantCount = await runQuery('SELECT COUNT(*) FROM telemetry_participants;');
  console.log(`✅ Teilnehmer: ${participantCount}`);

  // Zähle Runden
  const lapCount = await runQuery('SELECT COUNT(*) FROM telemetry_laps;');
  console.log(`✅ Runden: ${lapCount}`);

  // Zähle Runden mit Sector-Daten
  const completeLaps = await runQuery('SELECT COUNT(*) FROM telemetry_laps WHERE sector1_ms IS NOT NULL AND sector2_ms IS NOT NULL AND sector3_ms IS NOT NULL;');
  console.log(`✅ Vollständige Runden (mit allen Sectors): ${completeLaps}/${lapCount}`);

  // Zähle Assist-Felder
  const assistFilled = await runQuery('SELECT COUNT(*) FROM telemetry_participants WHERE steering_assist IS NOT NULL AND braking_assist IS NOT NULL;');
  console.log(`✅ Teilnehmer mit Assist-Daten: ${assistFilled}/${participantCount}`);

  // Zähle Tyre-Daten
  const tyreFilled = await runQuery('SELECT COUNT(*) FROM telemetry_participants WHERE visual_tyre_compound IS NOT NULL AND actual_tyre_compound IS NOT NULL;');
  console.log(`✅ Teilnehmer mit Tyre-Daten: ${tyreFilled}/${participantCount}`);

  // Zähle Speed Traps
  const speedTrapCount = await runQuery('SELECT COUNT(*) FROM telemetry_speed_traps;');
  console.log(`✅ Speed Traps: ${speedTrapCount}`);

  // Zähle Car Setups
  const carSetupCount = await runQuery('SELECT COUNT(*) FROM telemetry_car_setups;');
  console.log(`✅ Car Setups: ${carSetupCount}`);

  // Zähle Tyre Sets
  const tyreSetsCount = await runQuery('SELECT COUNT(*) FROM telemetry_tyre_sets;');
  console.log(`✅ Tyre Sets: ${tyreSetsCount}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
}

main();

