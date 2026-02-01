"""Script xóa các file test khỏi database"""
import sqlite3
import time

# Chờ database unlock
print("Đang kết nối database...")
for i in range(10):
    try:
        conn = sqlite3.connect('data/teledrive.db', timeout=30)
        cursor = conn.cursor()
        
        # Xóa các file test
        cursor.execute('''
            DELETE FROM files 
            WHERE name LIKE '%test%' OR name LIKE '%debug%' OR name LIKE '%final_test%'
        ''')
        deleted = cursor.rowcount
        conn.commit()
        print(f'Đã xóa {deleted} file test')
        
        # Đếm lại
        cursor.execute('SELECT COUNT(*) FROM files WHERE telegram_channel = "Saved Messages"')
        remaining = cursor.fetchone()[0]
        print(f'Còn lại {remaining} file từ Saved Messages')
        
        # Liệt kê files còn lại
        cursor.execute('SELECT id, name FROM files WHERE telegram_channel = "Saved Messages" LIMIT 20')
        print("\nDanh sách file còn lại:")
        for f in cursor.fetchall():
            print(f'  - {f[1]}')
        
        conn.close()
        break
    except sqlite3.OperationalError as e:
        print(f"Database locked, retry {i+1}/10...")
        time.sleep(2)
