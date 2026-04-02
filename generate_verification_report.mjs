#!/usr/bin/env node

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'league.db');

const db = new Database(dbPath);

let reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>F1 Telemetrie-Verifikationsbericht</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #e84545; text-align: center; }
    h2 { color: #404040; border-bottom: 2px solid #e84545; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #404040; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f9f9f9; }
    .status-ok { color: #27ae60; font-weight: bold; }
    .status-warning { color: #f39c12; font-weight: bold; }
    .status-error { color: #e84545; font-weight: bold; }
    .summary { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .stat-box { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-left: 4px solid #e84545; border-radius: 4px; }
    .stat-number { font-size: 24px; font-weight: bold; color: #e84545; }
    .stat-label { color: #666; font-size: 12px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏁 F1 Telemetrie-Datenbankverifikation</h1>
    <p style="text-align: center; color: #666;">Bericht vom ${new Date().toLocaleString('de-DE')}</p>
`;

try {
  // 1. Sessions
  const sessionsResult = db.prepare('SELECT COUNT(*) as count FROM telemetry_sessions').get();
  const sessions = sessionsResult.count;

  reportHtml += `
    <h2>📊 Überblick</h2>
    <div class="summary">
      <div class="stat-box">
        <div class="stat-number">${sessions}</div>
        <div class="stat-label">Sessions</div>
      </div>
  `;

  // 2. Teilnehmer
  const participantsResult = db.prepare('SELECT COUNT(*) as count FROM telemetry_participants').get();
  const participants = participantsResult.count;

  reportHtml += `
      <div class="stat-box">
        <div class="stat-number">${participants}</div>
        <div class="stat-label">Teilnehmer</div>
      </div>
  `;

  // 3. Runden
  const lapsResult = db.prepare('SELECT COUNT(*) as count FROM telemetry_laps').get();
  const laps = lapsResult.count;

  reportHtml += `
      <div class="stat-box">
        <div class="stat-number">${laps}</div>
        <div class="stat-label">Runden</div>
      </div>
    </div>
  `;

  // Sessions im Detail
  reportHtml += '<h2>✅ Telemetrie-Sessions</h2>';
  reportHtml += '<table><tr><th>ID</th><th>Track ID</th><th>Track Length</th><th>Session Type</th><th>Created At</th></tr>';

  const sessionsList = db.prepare(`
    SELECT id, track_id, track_length, session_type, created_at 
    FROM telemetry_sessions 
    ORDER BY created_at DESC LIMIT 5
  `).all();

  for (const session of sessionsList) {
    const trackOk = session.track_id ? '<span class="status-ok">✓</span>' : '<span class="status-error">✗</span>';
    const lengthOk = session.track_length ? '<span class="status-ok">✓</span>' : '<span class="status-error">✗</span>';
    const typeOk = session.session_type ? '<span class="status-ok">✓</span>' : '<span class="status-error">✗</span>';
    reportHtml += `<tr><td>${session.id}</td><td>${session.track_id} ${trackOk}</td><td>${session.track_length} ${lengthOk}</td><td>${session.session_type} ${typeOk}</td><td>${session.created_at}</td></tr>`;
  }
  reportHtml += '</table>';

  // Teilnehmer Statistik
  reportHtml += '<h2>👤 Telemetrie-Teilnehmer Statistik</h2>';
  const participantStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN game_name IS NOT NULL THEN 1 ELSE 0 END) as game_name_filled,
      SUM(CASE WHEN is_human IS NOT NULL THEN 1 ELSE 0 END) as is_human_filled,
      SUM(CASE WHEN team_id IS NOT NULL THEN 1 ELSE 0 END) as team_id_filled,
      SUM(CASE WHEN car_index IS NOT NULL THEN 1 ELSE 0 END) as car_index_filled,
      SUM(CASE WHEN position IS NOT NULL THEN 1 ELSE 0 END) as position_filled
    FROM telemetry_participants
  `).get();

  reportHtml += '<table><tr><th>Feld</th><th>Gefüllt</th><th>Status</th></tr>';
  const fields = [
    { name: 'game_name', key: 'game_name_filled' },
    { name: 'is_human', key: 'is_human_filled' },
    { name: 'team_id', key: 'team_id_filled' },
    { name: 'car_index', key: 'car_index_filled' },
    { name: 'position', key: 'position_filled' }
  ];

  for (const field of fields) {
    const filled = participantStats[field.key];
    const total = participantStats.total;
    const percentage = ((filled / total) * 100).toFixed(0);
    const status = filled === total ? '<span class="status-ok">✓ 100%</span>' : '<span class="status-warning">⚠️ ' + percentage + '%</span>';
    reportHtml += `<tr><td>${field.name}</td><td>${filled}/${total}</td><td>${status}</td></tr>`;
  }
  reportHtml += '</table>';

  // Lap Statistik
  reportHtml += '<h2>🏎️ Runden-Daten Statistik</h2>';
  const lapStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN lap_time_ms IS NOT NULL THEN 1 ELSE 0 END) as lap_time_filled,
      SUM(CASE WHEN tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as tyre_compound_filled,
      SUM(CASE WHEN sector1_ms IS NOT NULL THEN 1 ELSE 0 END) as sector1_filled,
      SUM(CASE WHEN sector2_ms IS NOT NULL THEN 1 ELSE 0 END) as sector2_filled,
      SUM(CASE WHEN sector3_ms IS NOT NULL THEN 1 ELSE 0 END) as sector3_filled
    FROM telemetry_laps
  `).get();

  reportHtml += '<table><tr><th>Feld</th><th>Gefüllt</th><th>Status</th></tr>';
  const lapFields = [
    { name: 'lap_time_ms', key: 'lap_time_filled' },
    { name: 'tyre_compound', key: 'tyre_compound_filled' },
    { name: 'sector1_ms', key: 'sector1_filled' },
    { name: 'sector2_ms', key: 'sector2_filled' },
    { name: 'sector3_ms', key: 'sector3_filled' }
  ];

  for (const field of lapFields) {
    const filled = lapStats[field.key];
    const total = lapStats.total;
    const percentage = ((filled / total) * 100).toFixed(0);
    const status = filled === total ? '<span class="status-ok">✓ 100%</span>' : '<span class="status-warning">⚠️ ' + percentage + '%</span>';
    reportHtml += `<tr><td>${field.name}</td><td>${filled}/${total}</td><td>${status}</td></tr>`;
  }
  reportHtml += '</table>';

  // Beispiel-Teilnehmer
  reportHtml += '<h2>📋 Beispiel-Teilnehmer (5 Stichproben)</h2>';
  reportHtml += '<table><tr><th>Name</th><th>Is Human</th><th>Team</th><th>Car</th><th>Position</th><th>Start Position</th></tr>';

  const sampleParticipants = db.prepare(`
    SELECT 
      game_name, is_human, team_id, car_index, position, start_position
    FROM telemetry_participants
    LIMIT 5
  `).all();

  for (const p of sampleParticipants) {
    reportHtml += `<tr>
      <td>${p.game_name}</td>
      <td>${p.is_human}</td>
      <td>${p.team_id}</td>
      <td>${p.car_index}</td>
      <td>${p.position}</td>
      <td>${p.start_position}</td>
    </tr>`;
  }
  reportHtml += '</table>';

  // Beispiel-Runden
  reportHtml += '<h2>🏁 Beispiel-Runden (10 Stichproben)</h2>';
  reportHtml += '<table><tr><th>Fahrer</th><th>Lap</th><th>Time (ms)</th><th>Tyre</th><th>S1</th><th>S2</th><th>S3</th><th>Valid</th></tr>';

  const sampleLaps = db.prepare(`
    SELECT 
      p.game_name, l.lap_number, l.lap_time_ms, l.tyre_compound,
      l.sector1_ms, l.sector2_ms, l.sector3_ms, l.is_valid
    FROM telemetry_laps l
    JOIN telemetry_participants p ON l.participant_id = p.id
    LIMIT 10
  `).all();

  for (const lap of sampleLaps) {
    const valid = lap.is_valid ? '<span class="status-ok">✓</span>' : '<span class="status-error">✗</span>';
    reportHtml += `<tr>
      <td>${lap.game_name}</td>
      <td>${lap.lap_number}</td>
      <td>${lap.lap_time_ms}</td>
      <td>${lap.tyre_compound}</td>
      <td>${lap.sector1_ms}</td>
      <td>${lap.sector2_ms}</td>
      <td>${lap.sector3_ms}</td>
      <td>${valid}</td>
    </tr>`;
  }
  reportHtml += '</table>';

  // Speed Traps, CarSetups, TyreSets
  reportHtml += '<h2>📈 Weitere Daten</h2>';
  const speedTrapsCount = db.prepare('SELECT COUNT(*) as count FROM telemetry_speed_traps').get();
  const carSetupsCount = db.prepare('SELECT COUNT(*) as count FROM telemetry_car_setups').get();
  const tyreSetsCount = db.prepare('SELECT COUNT(*) as count FROM telemetry_tyre_sets').get();

  reportHtml += `
    <table><tr><th>Datentyp</th><th>Anzahl</th><th>Status</th></tr>
    <tr><td>Speed Traps</td><td>${speedTrapsCount.count}</td><td>${speedTrapsCount.count > 0 ? '<span class="status-ok">✓ Vorhanden</span>' : '<span class="status-warning">⚠️ Leer</span>'}</td></tr>
    <tr><td>Car Setups</td><td>${carSetupsCount.count}</td><td>${carSetupsCount.count > 0 ? '<span class="status-ok">✓ Vorhanden</span>' : '<span class="status-warning">⚠️ Leer</span>'}</td></tr>
    <tr><td>Tyre Sets</td><td>${tyreSetsCount.count}</td><td>${tyreSetsCount.count > 0 ? '<span class="status-ok">✓ Vorhanden</span>' : '<span class="status-warning">⚠️ Leer</span>'}</td></tr>
    </table>
  `;

  // Zusammenfassung
  reportHtml += '<h2>✅ Zusammenfassung</h2>';
  const allParticipantsComplete = participantStats.total > 0 && participantStats.game_name_filled === participantStats.total;
  const allLapsComplete = lapStats.total > 0 && lapStats.sector1_filled === lapStats.total && lapStats.sector2_filled === lapStats.total && lapStats.sector3_filled === lapStats.total;

  reportHtml += '<div class="summary">';
  if (sessions > 0) {
    reportHtml += '<p class="status-ok">✅ Sessions vorhanden</p>';
  } else {
    reportHtml += '<p class="status-error">❌ KEINE Sessions vorhanden!</p>';
  }

  if (participants > 0) {
    reportHtml += '<p class="status-ok">✅ Teilnehmer vorhanden</p>';
  } else {
    reportHtml += '<p class="status-error">❌ KEINE Teilnehmer vorhanden!</p>';
  }

  if (allParticipantsComplete) {
    reportHtml += '<p class="status-ok">✅ Alle Teilnehmer-Felder vollständig gefüllt</p>';
  } else {
    reportHtml += `<p class="status-warning">⚠️ Teilnehmer-Felder nicht vollständig (${participantStats.game_name_filled}/${participantStats.total})</p>`;
  }

  if (laps > 0) {
    reportHtml += '<p class="status-ok">✅ Runden vorhanden</p>';
  } else {
    reportHtml += '<p class="status-error">❌ KEINE Runden vorhanden!</p>';
  }

  if (allLapsComplete) {
    reportHtml += '<p class="status-ok">✅ Alle Runden-Felder vollständig gefüllt (inkl. Sectors)</p>';
  } else {
    const sectorFill = Math.min(
      ((lapStats.sector1_filled / lapStats.total) * 100),
      ((lapStats.sector2_filled / lapStats.total) * 100),
      ((lapStats.sector3_filled / lapStats.total) * 100)
    ).toFixed(0);
    reportHtml += `<p class="status-warning">⚠️ Sector-Daten nicht vollständig (${sectorFill}%)</p>`;
  }
  reportHtml += '</div>';

} catch (error) {
  reportHtml += `<p class="status-error">❌ Fehler bei der Verarbeitung: ${error.message}</p>`;
}

reportHtml += `
  </div>
</body>
</html>
`;

db.close();

// Speichere den Report
const reportPath = path.join(__dirname, 'telemetry_verification_report.html');
writeFileSync(reportPath, reportHtml);

console.log(`✅ Report erstellt: ${reportPath}`);
console.log(`📊 Öffne den Report im Browser`);


