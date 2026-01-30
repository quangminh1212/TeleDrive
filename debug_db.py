import sqlite3

conn = sqlite3.connect('data/teledrive.db')
cur = conn.cursor()

# List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print("Tables:", [r[0] for r in cur.fetchall()])

# Check scan_sessions
try:
    cur.execute("SELECT * FROM scan_sessions ORDER BY id DESC LIMIT 3")
    print("\nScan sessions:")
    for r in cur.fetchall():
        print(f"  {r}")
except Exception as e:
    print(f"scan_sessions error: {e}")

# Check files
cur.execute("SELECT COUNT(*) FROM files")
print(f"\nTotal files: {cur.fetchone()[0]}")

# Check folders
try:
    cur.execute("SELECT * FROM folders ORDER BY id DESC LIMIT 3")
    print("\nFolders:")
    for r in cur.fetchall():
        print(f"  {r}")
except Exception as e:
    print(f"folders error: {e}")

conn.close()
