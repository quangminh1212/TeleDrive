#!/usr/bin/env python3
"""
Create a simple icon for TeleDrive
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    
    # Create a 256x256 image with gradient background
    size = 256
    img = Image.new('RGB', (size, size), color='#2196F3')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple telegram-style paper plane
    # Triangle shape
    points = [
        (size * 0.2, size * 0.5),
        (size * 0.8, size * 0.3),
        (size * 0.8, size * 0.7),
    ]
    draw.polygon(points, fill='white')
    
    # Add circle background
    circle_bbox = [size * 0.1, size * 0.1, size * 0.9, size * 0.9]
    draw.ellipse(circle_bbox, outline='white', width=8)
    
    # Save as ICO
    img.save('icon.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print("✅ Created icon.ico")
    
    # Also save as PNG for system tray
    img.save('icon.png', format='PNG')
    print("✅ Created icon.png")
    
except ImportError:
    print("⚠️  Pillow not installed. Run: pip install Pillow")
    print("Creating placeholder icon...")
    
    # Create a minimal placeholder
    with open('icon.ico', 'wb') as f:
        # Minimal ICO header
        f.write(b'\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x20\x00\x68\x04\x00\x00\x16\x00\x00\x00')
    print("✅ Created placeholder icon.ico")

except Exception as e:
    print(f"❌ Error creating icon: {e}")
