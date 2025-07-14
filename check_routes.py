#!/usr/bin/env python3
import sys
sys.path.append('.')

print("Importing ui_server...")
try:
    from ui_server import app
    print("✅ ui_server imported successfully")
    
    print("\nFlask app routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint} [{rule.methods}]")
        
    print(f"\nTotal routes: {len(list(app.url_map.iter_rules()))}")
    
except Exception as e:
    print(f"❌ Error importing ui_server: {e}")
    import traceback
    traceback.print_exc()
