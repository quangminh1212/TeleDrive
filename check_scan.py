import sqlite3

conn = sqlite3.connect('data/teledrive.db')
cur = conn.cursor()

cur.execute('SELECT id, channel_name, status, files_found, messages_scanned, error_message FROM scan_sessions ORDER BY id DESC LIMIT 5')
print("Recent scan sessions:")
for r in cur.fetchall():
    print(f"  ID: {r[0]}")
    print(f"  Channel: {r[1]}")
    print(f"  Status: {r[2]}")
    print(f"  Files found: {r[3]}")
    print(f"  Messages scanned: {r[4]}")
    print(f"  Error: {r[5]}")
    print("  ---")

conn.close()
