#!/usr/bin/env python3
import sqlite3
import json

db_path = 'league.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print('═══════════════════════════════════════════════════════════════')
print('  🏁 F1 Telemetrie-Datenbankverifikation (league.db)')
print('═══════════════════════════════════════════════════════════════\n')

# Überprüfe Telemetrie-Sessions
print('🔍 Überprüfe Telemetrie-Sessions...\n')
cursor.execute('''
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
''')

sessions = cursor.fetchall()
if len(sessions) == 0:
    print('❌ Keine Sessions gefunden!')
else:
    for session in sessions:
        print(f"✅ Session: {session['id']}")
        print(f"   Track ID: {session['track_id']} {'✓' if session['track_id'] else '❌'}")
        print(f"   Track Length: {session['track_length']} {'✓' if session['track_length'] else '❌'}")
        print(f"   Session Type: {session['session_type']} {'✓' if session['session_type'] else '❌'}")
        print(f"   Track Flags: {session['track_flags']}")
        print(f"   Pit Entry: {session['pit_entry']} {'✓' if session['pit_entry'] else '❌'}")
        print(f"   Pit Exit: {session['pit_exit']} {'✓' if session['pit_exit'] else '❌'}")
        print(f"   Created: {session['created_at']}\n")

# Überprüfe Telemetrie-Teilnehmer
print('🔍 Überprüfe Telemetrie-Teilnehmer...\n')
cursor.execute('''
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
''')

participants = cursor.fetchall()
if len(participants) == 0:
    print('❌ Keine Teilnehmer gefunden!')
else:
    for participant in participants:
        missing_fields = []
        if not participant['game_name']:
            missing_fields.append('game_name')
        if participant['team_id'] is None:
            missing_fields.append('team_id')
        if participant['position'] is None:
            missing_fields.append('position')
        if participant['car_index'] is None:
            missing_fields.append('car_index')
        if participant['is_human'] is None:
            missing_fields.append('is_human')

        status = '✅' if len(missing_fields) == 0 else '⚠️'
        print(f"{status} Teilnehmer: {participant['game_name']} (Car #{participant['car_index']})")
        print(f"   Session: {participant['session_id']}")
        print(f"   Position: {participant['position']}")
        print(f"   Is Human: {participant['is_human']}")
        print(f"   Team ID: {participant['team_id']}")
        print(f"   Steering Assist: {participant['steering_assist']}")
        print(f"   Braking Assist: {participant['braking_assist']}")
        print(f"   Gearbox Assist: {participant['gearbox_assist']}")
        print(f"   Traction Control: {participant['traction_control']}")
        print(f"   Anti-Lock Brakes: {participant['anti_lock_brakes']}")
        print(f"   Visual Tyre: {participant['visual_tyre_compound']} {'✓' if participant['visual_tyre_compound'] else '❌'}")
        print(f"   Actual Tyre: {participant['actual_tyre_compound']} {'✓' if participant['actual_tyre_compound'] else '❌'}")

        if len(missing_fields) > 0:
            print(f"   ❌ Leere Felder: {', '.join(missing_fields)}")
        print()

# Überprüfe Telemetrie-Runden
print('🔍 Überprüfe Telemetrie-Runden...\n')
cursor.execute('''
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
''')

laps = cursor.fetchall()
if len(laps) == 0:
    print('❌ Keine Runden gefunden!')
else:
    valid_count = 0
    invalid_count = 0

    for lap in laps:
        missing_fields = []
        if not lap['lap_time_ms']:
            missing_fields.append('lap_time_ms')
        if lap['tyre_compound'] is None:
            missing_fields.append('tyre_compound')
        if lap['sector1_ms'] is None:
            missing_fields.append('sector1_ms')
        if lap['sector2_ms'] is None:
            missing_fields.append('sector2_ms')
        if lap['sector3_ms'] is None:
            missing_fields.append('sector3_ms')

        if len(missing_fields) == 0:
            valid_count += 1
        else:
            invalid_count += 1

        status = '✅' if len(missing_fields) == 0 else '⚠️'
        print(f"{status} Lap {lap['lap_number']}: {lap['game_name']} - {lap['lap_time_ms']}ms")
        print(f"   Tyre: {lap['tyre_compound']} {'✓' if lap['tyre_compound'] else '❌'}")
        print(f"   S1: {lap['sector1_ms']}ms {'✓' if lap['sector1_ms'] else '❌'}, S2: {lap['sector2_ms']}ms {'✓' if lap['sector2_ms'] else '❌'}, S3: {lap['sector3_ms']}ms {'✓' if lap['sector3_ms'] else '❌'}")
        print(f"   Valid: {lap['is_valid']}")

        if len(missing_fields) > 0:
            print(f"   ❌ Leere Felder: {', '.join(missing_fields)}")

    print(f"\n   Summary: {valid_count} ✓ | {invalid_count} ✗")

# Überprüfe Speed Traps
print('\n🔍 Überprüfe Speed Traps...\n')
cursor.execute('''
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
''')

speed_traps = cursor.fetchall()
if len(speed_traps) == 0:
    print('❌ Keine Speed Traps gefunden!')
else:
    for trap in speed_traps:
        print(f"✅ Speed Trap: {trap['game_name']} - {trap['speed']:.2f} km/h")
        print(f"   Lap: {trap['lap_number']}, Distance: {trap['distance']}")

# Überprüfe Sector-Daten Aggregation
print('\n🔍 Überprüfe Sector-Daten Aggregation...\n')
cursor.execute('''
  SELECT
    COUNT(*) as total_laps,
    SUM(CASE WHEN sector1_ms IS NOT NULL THEN 1 ELSE 0 END) as sector1_filled,
    SUM(CASE WHEN sector2_ms IS NOT NULL THEN 1 ELSE 0 END) as sector2_filled,
    SUM(CASE WHEN sector3_ms IS NOT NULL THEN 1 ELSE 0 END) as sector3_filled,
    COUNT(*) - SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as invalid_laps
  FROM telemetry_laps
''')

sector_stats = cursor.fetchone()
print(f"   Gesamt Runden: {sector_stats['total_laps']}")
print(f"   Sector 1 gefüllt: {sector_stats['sector1_filled']}/{sector_stats['total_laps']} {'✅' if sector_stats['sector1_filled'] == sector_stats['total_laps'] else '⚠️'}")
print(f"   Sector 2 gefüllt: {sector_stats['sector2_filled']}/{sector_stats['total_laps']} {'✅' if sector_stats['sector2_filled'] == sector_stats['total_laps'] else '⚠️'}")
print(f"   Sector 3 gefüllt: {sector_stats['sector3_filled']}/{sector_stats['total_laps']} {'✅' if sector_stats['sector3_filled'] == sector_stats['total_laps'] else '⚠️'}")
print(f"   Ungültige Runden: {sector_stats['invalid_laps']}")

# Überprüfe Assist-Einstellungen Aggregation
print('\n🔍 Überprüfe Assist-Einstellungen...\n')
cursor.execute('''
  SELECT
    COUNT(*) as total_participants,
    SUM(CASE WHEN steering_assist IS NOT NULL THEN 1 ELSE 0 END) as steering_filled,
    SUM(CASE WHEN braking_assist IS NOT NULL THEN 1 ELSE 0 END) as braking_filled,
    SUM(CASE WHEN gearbox_assist IS NOT NULL THEN 1 ELSE 0 END) as gearbox_filled,
    SUM(CASE WHEN traction_control IS NOT NULL THEN 1 ELSE 0 END) as tc_filled,
    SUM(CASE WHEN anti_lock_brakes IS NOT NULL THEN 1 ELSE 0 END) as alb_filled
  FROM telemetry_participants
''')

assist_stats = cursor.fetchone()
print(f"   Gesamt Teilnehmer: {assist_stats['total_participants']}")
print(f"   Steering Assist: {assist_stats['steering_filled']}/{assist_stats['total_participants']} {'✅' if assist_stats['steering_filled'] == assist_stats['total_participants'] else '⚠️'}")
print(f"   Braking Assist: {assist_stats['braking_filled']}/{assist_stats['total_participants']} {'✅' if assist_stats['braking_filled'] == assist_stats['total_participants'] else '⚠️'}")
print(f"   Gearbox Assist: {assist_stats['gearbox_filled']}/{assist_stats['total_participants']} {'✅' if assist_stats['gearbox_filled'] == assist_stats['total_participants'] else '⚠️'}")
print(f"   Traction Control: {assist_stats['tc_filled']}/{assist_stats['total_participants']} {'✅' if assist_stats['tc_filled'] == assist_stats['total_participants'] else '⚠️'}")
print(f"   Anti-Lock Brakes: {assist_stats['alb_filled']}/{assist_stats['total_participants']} {'✅' if assist_stats['alb_filled'] == assist_stats['total_participants'] else '⚠️'}")

# Überprüfe Tyren-Compounds
print('\n🔍 Überprüfe Tyre-Compounds...\n')
cursor.execute('''
  SELECT
    COUNT(*) as total_participants,
    SUM(CASE WHEN visual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as visual_filled,
    SUM(CASE WHEN actual_tyre_compound IS NOT NULL THEN 1 ELSE 0 END) as actual_filled
  FROM telemetry_participants
''')

tyre_stats = cursor.fetchone()
print(f"   Gesamt Teilnehmer: {tyre_stats['total_participants']}")
print(f"   Visual Tyre Compound: {tyre_stats['visual_filled']}/{tyre_stats['total_participants']} {'✅' if tyre_stats['visual_filled'] == tyre_stats['total_participants'] else '⚠️'}")
print(f"   Actual Tyre Compound: {tyre_stats['actual_filled']}/{tyre_stats['total_participants']} {'✅' if tyre_stats['actual_filled'] == tyre_stats['total_participants'] else '⚠️'}")

# Überprüfe CarSetups
print('\n🔍 Überprüfe Car Setups...\n')
cursor.execute('''
  SELECT
    COUNT(*) as total_setups,
    COUNT(DISTINCT participant_id) as participants_with_setups
  FROM telemetry_car_setups
''')

setup_stats = cursor.fetchone()
if setup_stats['total_setups'] == 0:
    print('❌ Keine Car Setups gefunden!')
else:
    print(f"✅ Car Setups: {setup_stats['total_setups']} Einträge für {setup_stats['participants_with_setups']} Teilnehmer")

# Überprüfe TyreSets
print('\n🔍 Überprüfe Tyre Sets...\n')
cursor.execute('''
  SELECT
    COUNT(*) as total_tyre_sets,
    COUNT(DISTINCT participant_id) as participants_with_tyres
  FROM telemetry_tyre_sets
''')

tyre_sets_stats = cursor.fetchone()
if tyre_sets_stats['total_tyre_sets'] == 0:
    print('⚠️  Keine Tyre Sets gefunden!')
else:
    print(f"✅ Tyre Sets: {tyre_sets_stats['total_tyre_sets']} Einträge für {tyre_sets_stats['participants_with_tyres']} Teilnehmer")

conn.close()

print('\n═══════════════════════════════════════════════════════════════')
print('  ✅ Verifikation abgeschlossen')
print('═══════════════════════════════════════════════════════════════\n')

