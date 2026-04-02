-- Telemetrie-Verifikation für Kleosa S2 Renndaten
-- Session IDs überprüfen

-- 1. Überprüfe, wie viele Sessions existieren
SELECT 'SESSIONS' as "Check", COUNT(*) as count FROM telemetry_sessions;

-- 2. Überprüfe die letzten 5 Sessions im Detail
.mode column
.headers on
SELECT id, track_id, track_length, session_type, created_at FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5;

-- 3. Überprüfe Teilnehmer pro Session
SELECT p.session_id, COUNT(*) as participant_count FROM telemetry_participants p GROUP BY p.session_id ORDER BY p.session_id DESC LIMIT 5;

-- 4. Überprüfe ob alle Felder der _telemetry Tabellen gefüllt sind
SELECT
  COUNT(*) as total_participants,
  SUM(CASE WHEN game_name IS NOT NULL THEN 1 ELSE 0 END) as game_name_filled,
  SUM(CASE WHEN is_human IS NOT NULL THEN 1 ELSE 0 END) as is_human_filled,
  SUM(CASE WHEN team_id IS NOT NULL THEN 1 ELSE 0 END) as team_id_filled,
  SUM(CASE WHEN steering_assist IS NOT NULL THEN 1 ELSE 0 END) as steering_filled,
  SUM(CASE WHEN braking_assist IS NOT NULL THEN 1 ELSE 0 END) as braking_filled,
  SUM(CASE WHEN visual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as visual_tyre_filled,
  SUM(CASE WHEN actual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as actual_tyre_filled
FROM telemetry_participants;

-- 5. Überprüfe Lap-Daten
SELECT
  COUNT(*) as total_laps,
  SUM(CASE WHEN lap_time_ms IS NOT NULL THEN 1 ELSE 0 END) as lap_time_filled,
  SUM(CASE WHEN tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as tyre_compound_filled,
  SUM(CASE WHEN sector1_ms IS NOT NULL THEN 1 ELSE 0 END) as sector1_filled,
  SUM(CASE WHEN sector2_ms IS NOT NULL THEN 1 ELSE 0 END) as sector2_filled,
  SUM(CASE WHEN sector3_ms IS NOT NULL THEN 1 ELSE 0 END) as sector3_filled
FROM telemetry_laps;

-- 6. Überprüfe ob Speed Traps vorhanden sind
SELECT COUNT(*) as speed_traps FROM telemetry_speed_traps;

-- 7. Überprüfe CarSetups
SELECT COUNT(*) as car_setups FROM telemetry_car_setups;

-- 8. Überprüfe TyreSets
SELECT COUNT(*) as tyre_sets FROM telemetry_tyre_sets;

-- 9. Zeige einen Beispiel-Teilnehmer mit allen Daten
SELECT
  game_name,
  is_human,
  team_id,
  car_index,
  position,
  steering_assist,
  braking_assist,
  gearbox_assist,
  traction_control,
  anti_lock_brakes,
  visual_tyre_compound,
  actual_tyre_compound
FROM telemetry_participants
LIMIT 5;

-- 10. Überprüfe einige Lap-Daten
SELECT
  p.game_name,
  l.lap_number,
  l.lap_time_ms,
  l.tyre_compound,
  l.sector1_ms,
  l.sector2_ms,
  l.sector3_ms,
  l.is_valid
FROM telemetry_laps l
JOIN telemetry_participants p ON l.participant_id = p.id
LIMIT 10;

