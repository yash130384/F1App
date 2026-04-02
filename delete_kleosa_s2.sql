-- Script to delete Kleosa S2 telemetry data
-- This script respects foreign keys and deletes in the correct order

-- Find league ID
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
),
kleosa_participants AS (
  SELECT id FROM telemetry_participants
  WHERE session_id IN (SELECT id FROM kleosa_sessions)
)
DELETE FROM telemetry_lap_samples
WHERE lap_id IN (
  SELECT id FROM telemetry_laps
  WHERE participant_id IN (SELECT id FROM kleosa_participants)
);

-- Delete laps
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
),
kleosa_participants AS (
  SELECT id FROM telemetry_participants
  WHERE session_id IN (SELECT id FROM kleosa_sessions)
)
DELETE FROM telemetry_laps
WHERE participant_id IN (SELECT id FROM kleosa_participants);

-- Delete car setups
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
),
kleosa_participants AS (
  SELECT id FROM telemetry_participants
  WHERE session_id IN (SELECT id FROM kleosa_sessions)
)
DELETE FROM telemetry_car_setups
WHERE participant_id IN (SELECT id FROM kleosa_participants);

-- Delete tyre sets
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
),
kleosa_participants AS (
  SELECT id FROM telemetry_participants
  WHERE session_id IN (SELECT id FROM kleosa_sessions)
)
DELETE FROM telemetry_tyre_sets
WHERE participant_id IN (SELECT id FROM kleosa_participants);

-- Delete speed traps
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
)
DELETE FROM telemetry_speed_traps
WHERE session_id IN (SELECT id FROM kleosa_sessions);

-- Delete participants
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
)
DELETE FROM telemetry_participants
WHERE session_id IN (SELECT id FROM kleosa_sessions);

-- Delete position history
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
)
DELETE FROM telemetry_position_history
WHERE session_id IN (SELECT id FROM kleosa_sessions);

-- Delete incidents
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
)
DELETE FROM telemetry_incidents
WHERE session_id IN (SELECT id FROM kleosa_sessions);

-- Delete safety car events
WITH kleosa_league AS (
  SELECT id FROM leagues WHERE name = 'Kleosa S2'
),
kleosa_sessions AS (
  SELECT id FROM telemetry_sessions
  WHERE league_id IN (SELECT id FROM kleosa_league)
)
DELETE FROM telemetry_safety_car_events
WHERE session_id IN (SELECT id FROM kleosa_sessions);

-- Delete sessions
DELETE FROM telemetry_sessions
WHERE league_id IN (SELECT id FROM leagues WHERE name = 'Kleosa S2');

-- Verify deletion
SELECT
  (SELECT COUNT(*) FROM telemetry_sessions WHERE league_id IN (SELECT id FROM leagues WHERE name = 'Kleosa S2')) as remaining_sessions,
  (SELECT COUNT(*) FROM telemetry_participants WHERE session_id IN (SELECT id FROM telemetry_sessions WHERE league_id IN (SELECT id FROM leagues WHERE name = 'Kleosa S2'))) as remaining_participants,
  (SELECT COUNT(*) FROM telemetry_laps WHERE participant_id IN (SELECT id FROM telemetry_participants WHERE session_id IN (SELECT id FROM telemetry_sessions WHERE league_id IN (SELECT id FROM leagues WHERE name = 'Kleosa S2')))) as remaining_laps;

