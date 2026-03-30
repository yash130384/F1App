import { pgTable, text, timestamp, integer, boolean, real, uniqueIndex, index, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Ligen
 */
export const leagues = pgTable('leagues', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  name: text('name').unique().notNull(),
  adminPassword: text('admin_password').notNull(),
  joinPassword: text('join_password').notNull(),
});

/**
 * Teams
 */
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  color: text('color').default('#ffffff'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Benutzer (Globale User-Accounts)
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  username: text('username').notNull(),
  globalColor: text('global_color').default('#ffffff'),
  avatarUrl: text('avatar_url'),
  steamName: text('steam_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Fahrer (Liga-spezifisches Profil eines Users)
 */
export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  name: text('name').notNull(),
  team: text('team'), // Redundant, aber oft in alten Daten genutzt
  gameName: text('game_name'),
  color: text('color').default('#ffffff'),
  totalPoints: integer('total_points').default(0),
  rawPoints: integer('raw_points').default(0),
});

/**
 * Rennen
 */
export const races = pgTable('races', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  track: text('track'),
  raceDate: timestamp('race_date').defaultNow(),
  isFinished: boolean('is_finished').default(true),
  scheduledDate: timestamp('scheduled_date'),
  isRandom: boolean('is_random').default(false),
  revealHoursBefore: integer('reveal_hours_before').default(0),
});

/**
 * Rennergebnisse
 */
export const raceResults = pgTable('race_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  raceId: uuid('race_id').references(() => races.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  qualiPosition: integer('quali_position').default(0),
  fastestLap: boolean('fastest_lap').default(false),
  cleanDriver: boolean('clean_driver').default(false),
  pointsEarned: integer('points_earned').default(0),
  isDnf: boolean('is_dnf').default(false),
  isDropped: boolean('is_dropped').default(false),
  pitStops: integer('pit_stops').default(0),
  warnings: integer('warnings').default(0),
  penaltiesTime: integer('penalties_time').default(0),
});

/**
 * Punkte-Konfiguration
 */
export const pointsConfig = pgTable('points_config', {
  leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }).primaryKey(),
  pointsJson: text('points_json').notNull(),
  qualiPointsJson: text('quali_points_json').default('{}'),
  fastestLapBonus: integer('fastest_lap_bonus').default(2),
  cleanDriverBonus: integer('clean_driver_bonus').default(3),
  totalRaces: integer('total_races').default(0),
  trackPool: text('track_pool').default('[]'),
  dropResultsCount: integer('drop_results_count').default(0),
  teamCompetition: boolean('team_competition').default(false),
});

/**
 * Telemetrie-Sessions
 */
export const telemetrySessions = pgTable('telemetry_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }).notNull(),
  raceId: uuid('race_id').references(() => races.id, { onDelete: 'set null' }),
  trackId: integer('track_id'),
  trackLength: integer('track_length'),
  sessionType: text('session_type'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  trackFlags: integer('track_flags').default(0),
  pitEntry: real('pit_entry'),
  pitExit: real('pit_exit'),
}, (table) => ({
  leagueIdx: index('telemetry_sessions_league_id_idx').on(table.leagueId),
  raceIdx: index('telemetry_sessions_race_id_idx').on(table.raceId),
}));

/**
 * Telemetrie-Teilnehmer
 */
export const telemetryParticipants = pgTable('telemetry_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => telemetrySessions.id, { onDelete: 'cascade' }).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
  gameName: text('game_name').notNull(),
  teamId: integer('team_id'),
  startPosition: integer('start_position'),
  position: integer('position'),
  carIndex: integer('car_index'),
  lapDistance: real('lap_distance'),
  topSpeed: real('top_speed'),
  isHuman: boolean('is_human').default(false),
  pitStops: integer('pit_stops').default(0),
  warnings: integer('warnings').default(0),
  penaltiesTime: integer('penalties_time').default(0),
  // F1 25 Erweiterungen
  visualTyreCompound: integer('visual_tyre_compound'),
  actualTyreCompound: integer('actual_tyre_compound'),
  tyreAgeLaps: integer('tyre_age_laps'),
  enginePowerICE: real('engine_power_ice'),
  enginePowerMGUK: real('engine_power_mguk'),
}, (table) => ({
  sessionGameNameUniq: uniqueIndex('telemetry_participants_session_game_name_uniq').on(table.sessionId, table.gameName),
  sessionIdx: index('telemetry_participants_session_id_idx').on(table.sessionId),
}));

/**
 * Telemetrie-Runden
 */
export const telemetryLaps = pgTable('telemetry_laps', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id').references(() => telemetryParticipants.id, { onDelete: 'cascade' }).notNull(),
  lapNumber: integer('lap_number').notNull(),
  lapTimeMs: integer('lap_time_ms').notNull(),
  isValid: boolean('is_valid').default(true),
  tyreCompound: integer('tyre_compound'),
  isPitLap: boolean('is_pit_lap').default(false),
  sector1Ms: integer('sector1_ms'),
  sector2Ms: integer('sector2_ms'),
  sector3Ms: integer('sector3_ms'),
  carDamageJson: text('car_damage_json'),
}, (table) => ({
  participantIdx: index('telemetry_laps_participant_id_idx').on(table.participantId),
  lapNumberIdx: index('telemetry_laps_lap_number_idx').on(table.lapNumber),
}));

/**
 * Telemetrie-Stints
 */
export const telemetryStints = pgTable('telemetry_stints', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id').references(() => telemetryParticipants.id, { onDelete: 'cascade' }).notNull(),
  stintNumber: integer('stint_number').notNull(),
  tyreCompound: integer('tyre_compound').notNull(),
  visualCompound: integer('visual_compound').notNull(),
  startLap: integer('start_lap').notNull(),
  endLap: integer('end_lap'),
  tyreAgeAtStart: integer('tyre_age_at_start').default(0),
}, (table) => ({
  participantIdx: index('telemetry_stints_participant_id_idx').on(table.participantId),
}));

/**
 * Telemetrie-Position-History
 */
export const telemetryPositionHistory = pgTable('telemetry_position_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => telemetrySessions.id, { onDelete: 'cascade' }).notNull(),
  carIndex: integer('car_index').notNull(),
  lapNumber: integer('lap_number').notNull(),
  position: integer('position').notNull(),
}, (table) => ({
  sessionIdx: index('telemetry_position_history_session_id_idx').on(table.sessionId),
  sessionCarLapIdx: index('telemetry_pos_history_session_car_lap_idx').on(table.sessionId, table.carIndex, table.lapNumber),
}));

/**
 * Telemetrie-Incidents
 */
export const telemetryIncidents = pgTable('telemetry_incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => telemetrySessions.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  details: text('details').notNull(),
  vehicleIdx: integer('vehicle_idx'),
  otherVehicleIdx: integer('other_vehicle_idx'),
  lapNum: integer('lap_num'),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  sessionIdx: index('telemetry_incidents_session_id_idx').on(table.sessionId),
}));

/**
 * Telemetrie-Proben (Samples)
 */
export const telemetryLapSamples = pgTable('telemetry_lap_samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  lapId: uuid('lap_id').unique().notNull(), // Verweis auf telemetry_laps.id (optional, da UUID unique ist)
  samplesJson: text('samples_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  lapIdx: index('telemetry_lap_samples_lap_id_idx').on(table.lapId),
}));

/**
 * Safety-Car Events
 */
export const telemetrySafetyCarEvents = pgTable('telemetry_safety_car_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => telemetrySessions.id, { onDelete: 'cascade' }).notNull(),
  safetyCarType: integer('safety_car_type').notNull(),
  eventType: integer('event_type').notNull(),
  lapNumber: integer('lap_number').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('telemetry_safety_car_events_session_id_idx').on(table.sessionId),
}));

/**
 * Fahrzeug-Setups (F1 25)
 */
export const telemetryCarSetups = pgTable('telemetry_car_setups', {
  id: uuid('id').defaultRandom().primaryKey(),
  participantId: uuid('participant_id').references(() => telemetryParticipants.id, { onDelete: 'cascade' }).notNull(),
  lapNumber: integer('lap_number').notNull(),
  setupJson: text('setup_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  participantIdx: index('telemetry_car_setups_participant_id_idx').on(table.participantId),
}));

/**
 * Speed Traps
 */
export const telemetrySpeedTraps = pgTable('telemetry_speed_traps', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => telemetrySessions.id, { onDelete: 'cascade' }).notNull(),
  participantId: uuid('participant_id').references(() => telemetryParticipants.id, { onDelete: 'cascade' }).notNull(),
  speed: real('speed').notNull(),
  lapNumber: integer('lap_number'),
  distance: real('distance'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  sessionIdx: index('telemetry_speed_traps_session_id_idx').on(table.sessionId),
}));

/**
 * Strecken-Metadaten (Kurven-Mapping etc.)
 */
export const telemetryTrackMetadata = pgTable('telemetry_track_metadata', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackId: integer('track_id').notNull(),
  curveName: text('curve_name').notNull(),
  distanceStart: real('distance_start').notNull(),
  distanceEnd: real('distance_end').notNull(),
}, (table) => ({
  trackIdx: index('telemetry_track_metadata_track_id_idx').on(table.trackId),
}));
