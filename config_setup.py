#!/usr/bin/env python3
"""
TeleDrive Config Setup Utility
Tiện ích thiết lập và quản lý cấu hình TeleDrive
"""

import json
import os
import sys
from config_manager import ConfigManager

def main():
    """Main configuration setup"""
    print("=" * 60)
    print("           THIẾT LẬP CẤU HÌNH TELEDRIVE")
    print("=" * 60)
    
    config_mgr = ConfigManager()
    
    while True:
        print("\n🔧 MENU QUẢN LÝ CẤU HÌNH")
        print("-" * 40)
        print("1. 📱 Cấu hình Telegram API")
        print("2. 📺 Quản lý kênh/group")
        print("3. 📁 Cấu hình Output")
        print("4. 🔍 Cấu hình Scanning")
        print("5. 🎨 Cấu hình UI")
        print("6. 💾 Cấu hình Database")
        print("7. 🔔 Cấu hình Notifications")
        print("8. 📊 Xem cấu hình hiện tại")
        print("9. ✅ Kiểm tra validation")
        print("10. 🔄 Reset về mặc định")
        print("0. ❌ Thoát")
        print("-" * 40)
        
        choice = input("Chọn (0-10): ").strip()
        
        if choice == '0':
            print("👋 Tạm biệt!")
            break
        elif choice == '1':
            setup_telegram_api(config_mgr)
        elif choice == '2':
            manage_channels(config_mgr)
        elif choice == '3':
            setup_output(config_mgr)
        elif choice == '4':
            setup_scanning(config_mgr)
        elif choice == '5':
            setup_ui(config_mgr)
        elif choice == '6':
            setup_database(config_mgr)
        elif choice == '7':
            setup_notifications(config_mgr)
        elif choice == '8':
            config_mgr.print_config()
        elif choice == '9':
            config_mgr.validate_configuration()
        elif choice == '10':
            if confirm_reset():
                config_mgr.config = config_mgr.get_default_config()
                config_mgr.save_config()
                print("✅ Đã reset về cấu hình mặc định!")
        else:
            print("❌ Lựa chọn không hợp lệ!")
        
        input("\n⏸️ Nhấn Enter để tiếp tục...")

def setup_telegram_api(config_mgr):
    """Setup Telegram API configuration"""
    print("\n📱 CẤU HÌNH TELEGRAM API")
    print("-" * 30)
    print("💡 Lấy thông tin API tại: https://my.telegram.org/apps")
    print()
    
    current = config_mgr.get_config('telegram')
    
    print(f"API ID hiện tại: {current.get('api_id', 'Chưa cấu hình')}")
    api_id = input("Nhập API ID mới (Enter để giữ nguyên): ").strip()
    
    print(f"API Hash hiện tại: {'*' * len(current.get('api_hash', '')) if current.get('api_hash') else 'Chưa cấu hình'}")
    api_hash = input("Nhập API Hash mới (Enter để giữ nguyên): ").strip()
    
    print(f"Số điện thoại hiện tại: {current.get('phone_number', 'Chưa cấu hình')}")
    phone = input("Nhập số điện thoại (+84xxxxxxxxx) (Enter để giữ nguyên): ").strip()
    
    # Validate inputs
    if api_id and not api_id.isdigit():
        print("❌ API ID phải là số!")
        return
    
    if phone and not phone.startswith('+'):
        print("❌ Số điện thoại phải bắt đầu bằng +!")
        return
    
    # Update config
    updates = {}
    if api_id:
        updates['api_id'] = api_id
    if api_hash:
        updates['api_hash'] = api_hash
    if phone:
        updates['phone_number'] = phone
    
    if updates:
        config_mgr.config['telegram'].update(updates)
        if config_mgr.save_config():
            print("✅ Đã cập nhật cấu hình Telegram API!")
        else:
            print("❌ Lỗi khi lưu cấu hình!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def manage_channels(config_mgr):
    """Manage channels configuration"""
    print("\n📺 QUẢN LÝ KÊNH/GROUP")
    print("-" * 25)
    
    while True:
        channels = config_mgr.get_config('channels').get('list', [])
        
        print(f"\n📋 DANH SÁCH KÊNH ({len(channels)} kênh)")
        print("-" * 40)
        
        if not channels:
            print("📭 Chưa có kênh nào được cấu hình")
        else:
            for i, channel in enumerate(channels, 1):
                status = "✅" if channel.get('enabled') else "❌"
                print(f"{i}. {status} {channel['name']} ({channel['type']}) - {channel['identifier']}")
        
        print("\n🔧 HÀNH ĐỘNG")
        print("1. ➕ Thêm kênh mới")
        print("2. ✏️ Sửa kênh")
        print("3. 🗑️ Xóa kênh")
        print("4. 🔄 Bật/tắt kênh")
        print("0. ⬅️ Quay lại")
        
        choice = input("Chọn (0-4): ").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            add_channel(config_mgr)
        elif choice == '2':
            edit_channel(config_mgr, channels)
        elif choice == '3':
            delete_channel(config_mgr, channels)
        elif choice == '4':
            toggle_channel(config_mgr, channels)

def add_channel(config_mgr):
    """Add new channel"""
    print("\n➕ THÊM KÊNH MỚI")
    print("-" * 20)
    
    channel_id = input("ID kênh (unique): ").strip()
    if not channel_id:
        print("❌ ID kênh không được trống!")
        return
    
    name = input("Tên kênh: ").strip()
    if not name:
        print("❌ Tên kênh không được trống!")
        return
    
    print("Loại kênh:")
    print("1. Public channel")
    print("2. Private channel")
    print("3. Group")
    
    type_choice = input("Chọn loại (1-3): ").strip()
    type_map = {'1': 'public', '2': 'private', '3': 'group'}
    
    if type_choice not in type_map:
        print("❌ Lựa chọn không hợp lệ!")
        return
    
    channel_type = type_map[type_choice]
    
    if channel_type == 'public':
        identifier = input("Username kênh (@channelname): ").strip()
        if not identifier.startswith('@'):
            identifier = '@' + identifier
    else:
        identifier = input("Link mời hoặc username: ").strip()
    
    invite_link = ""
    if channel_type in ['private', 'group']:
        invite_link = input("Link mời (nếu có): ").strip()
    
    description = input("Mô tả (tùy chọn): ").strip()
    
    channel_data = {
        'id': channel_id,
        'name': name,
        'description': description,
        'type': channel_type,
        'identifier': identifier,
        'invite_link': invite_link,
        'enabled': True
    }
    
    try:
        if config_mgr.add_channel(channel_data):
            print("✅ Đã thêm kênh thành công!")
        else:
            print("❌ Lỗi khi thêm kênh!")
    except ValueError as e:
        print(f"❌ {e}")

def edit_channel(config_mgr, channels):
    """Edit existing channel"""
    if not channels:
        print("📭 Không có kênh nào để sửa!")
        return
    
    print("\n✏️ SỬA KÊNH")
    print("-" * 15)
    
    for i, channel in enumerate(channels, 1):
        print(f"{i}. {channel['name']} ({channel['id']})")
    
    try:
        choice = int(input("Chọn kênh để sửa: ")) - 1
        if 0 <= choice < len(channels):
            channel = channels[choice]
            
            print(f"\nSửa kênh: {channel['name']}")
            new_name = input(f"Tên mới (hiện tại: {channel['name']}): ").strip()
            new_desc = input(f"Mô tả mới (hiện tại: {channel.get('description', '')}): ").strip()
            
            updates = {}
            if new_name:
                updates['name'] = new_name
            if new_desc:
                updates['description'] = new_desc
            
            if updates:
                if config_mgr.update_channel(channel['id'], updates):
                    print("✅ Đã cập nhật kênh!")
                else:
                    print("❌ Lỗi khi cập nhật!")
            else:
                print("ℹ️ Không có thay đổi!")
        else:
            print("❌ Lựa chọn không hợp lệ!")
    except ValueError:
        print("❌ Vui lòng nhập số!")

def delete_channel(config_mgr, channels):
    """Delete channel"""
    if not channels:
        print("📭 Không có kênh nào để xóa!")
        return
    
    print("\n🗑️ XÓA KÊNH")
    print("-" * 15)
    
    for i, channel in enumerate(channels, 1):
        print(f"{i}. {channel['name']} ({channel['id']})")
    
    try:
        choice = int(input("Chọn kênh để xóa: ")) - 1
        if 0 <= choice < len(channels):
            channel = channels[choice]
            
            confirm = input(f"Xác nhận xóa '{channel['name']}'? (y/N): ").strip().lower()
            if confirm == 'y':
                if config_mgr.remove_channel(channel['id']):
                    print("✅ Đã xóa kênh!")
                else:
                    print("❌ Lỗi khi xóa!")
            else:
                print("ℹ️ Đã hủy!")
        else:
            print("❌ Lựa chọn không hợp lệ!")
    except ValueError:
        print("❌ Vui lòng nhập số!")

def toggle_channel(config_mgr, channels):
    """Toggle channel enabled status"""
    if not channels:
        print("📭 Không có kênh nào!")
        return
    
    print("\n🔄 BẬT/TẮT KÊNH")
    print("-" * 18)
    
    for i, channel in enumerate(channels, 1):
        status = "✅ Bật" if channel.get('enabled') else "❌ Tắt"
        print(f"{i}. {channel['name']} - {status}")
    
    try:
        choice = int(input("Chọn kênh để bật/tắt: ")) - 1
        if 0 <= choice < len(channels):
            channel = channels[choice]
            new_status = not channel.get('enabled', False)
            
            if config_mgr.update_channel(channel['id'], {'enabled': new_status}):
                status_text = "bật" if new_status else "tắt"
                print(f"✅ Đã {status_text} kênh '{channel['name']}'!")
            else:
                print("❌ Lỗi khi cập nhật!")
        else:
            print("❌ Lựa chọn không hợp lệ!")
    except ValueError:
        print("❌ Vui lòng nhập số!")

def setup_output(config_mgr):
    """Setup output configuration"""
    print("\n📁 CẤU HÌNH OUTPUT")
    print("-" * 25)
    
    current = config_mgr.get_config('output')
    
    print(f"Thư mục hiện tại: {current.get('directory', 'output')}")
    directory = input("Thư mục output mới (Enter để giữ nguyên): ").strip()
    
    formats = current.get('formats', {})
    print(f"\nCSV: {'✅ Bật' if formats.get('csv', {}).get('enabled') else '❌ Tắt'}")
    csv_choice = input("Bật CSV? (y/n/Enter để giữ nguyên): ").strip().lower()
    
    print(f"JSON: {'✅ Bật' if formats.get('json', {}).get('enabled') else '❌ Tắt'}")
    json_choice = input("Bật JSON? (y/n/Enter để giữ nguyên): ").strip().lower()
    
    print(f"Excel: {'✅ Bật' if formats.get('excel', {}).get('enabled') else '❌ Tắt'}")
    excel_choice = input("Bật Excel? (y/n/Enter để giữ nguyên): ").strip().lower()
    
    # Update config
    updates = {}
    if directory:
        updates['directory'] = directory
    
    if csv_choice in ['y', 'n']:
        if 'formats' not in updates:
            updates['formats'] = current.get('formats', {})
        if 'csv' not in updates['formats']:
            updates['formats']['csv'] = {}
        updates['formats']['csv']['enabled'] = csv_choice == 'y'
    
    if json_choice in ['y', 'n']:
        if 'formats' not in updates:
            updates['formats'] = current.get('formats', {})
        if 'json' not in updates['formats']:
            updates['formats']['json'] = {}
        updates['formats']['json']['enabled'] = json_choice == 'y'
    
    if excel_choice in ['y', 'n']:
        if 'formats' not in updates:
            updates['formats'] = current.get('formats', {})
        if 'excel' not in updates['formats']:
            updates['formats']['excel'] = {}
        updates['formats']['excel']['enabled'] = excel_choice == 'y'
    
    if updates:
        config_mgr.config['output'].update(updates)
        if config_mgr.save_config():
            print("✅ Đã cập nhật cấu hình output!")
        else:
            print("❌ Lỗi khi lưu cấu hình!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def setup_scanning(config_mgr):
    """Setup scanning configuration"""
    print("\n🔍 CẤU HÌNH SCANNING")
    print("-" * 28)
    
    current = config_mgr.get_config('scanning')
    
    print(f"Max messages hiện tại: {current.get('max_messages', 'Không giới hạn')}")
    max_msg = input("Số message tối đa (Enter = không giới hạn): ").strip()
    
    print(f"Batch size hiện tại: {current.get('batch_size', 100)}")
    batch = input("Batch size (Enter để giữ nguyên): ").strip()
    
    updates = {}
    if max_msg:
        if max_msg.isdigit():
            updates['max_messages'] = int(max_msg)
        else:
            print("❌ Max messages phải là số!")
            return
    
    if batch:
        if batch.isdigit():
            updates['batch_size'] = int(batch)
        else:
            print("❌ Batch size phải là số!")
            return
    
    if updates:
        config_mgr.config['scanning'].update(updates)
        if config_mgr.save_config():
            print("✅ Đã cập nhật cấu hình scanning!")
        else:
            print("❌ Lỗi khi lưu cấu hình!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def setup_ui(config_mgr):
    """Setup UI configuration"""
    print("\n🎨 CẤU HÌNH UI")
    print("-" * 20)
    
    current = config_mgr.get_config('ui')
    server = current.get('server', {})
    
    print(f"Host hiện tại: {server.get('host', '127.0.0.1')}")
    host = input("Host mới (Enter để giữ nguyên): ").strip()
    
    print(f"Port hiện tại: {server.get('port', 8080)}")
    port = input("Port mới (Enter để giữ nguyên): ").strip()
    
    theme = current.get('theme', {})
    print(f"Dark mode: {'✅ Bật' if theme.get('dark_mode') else '❌ Tắt'}")
    dark_mode = input("Bật dark mode? (y/n/Enter để giữ nguyên): ").strip().lower()
    
    updates = {}
    if host:
        updates['server'] = server.copy()
        updates['server']['host'] = host
    
    if port:
        if port.isdigit():
            if 'server' not in updates:
                updates['server'] = server.copy()
            updates['server']['port'] = int(port)
        else:
            print("❌ Port phải là số!")
            return
    
    if dark_mode in ['y', 'n']:
        updates['theme'] = theme.copy()
        updates['theme']['dark_mode'] = dark_mode == 'y'
    
    if updates:
        if config_mgr.update_ui_config('', updates):
            print("✅ Đã cập nhật cấu hình UI!")
        else:
            print("❌ Lỗi khi lưu cấu hình!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def setup_database(config_mgr):
    """Setup database configuration"""
    print("\n💾 CẤU HÌNH DATABASE")
    print("-" * 28)
    
    current = config_mgr.get_config('database')
    
    print(f"Loại database hiện tại: {current.get('type', 'sqlite')}")
    print("1. SQLite (khuyến nghị)")
    print("2. MySQL")
    print("3. PostgreSQL")
    
    db_choice = input("Chọn database (1-3, Enter để giữ nguyên): ").strip()
    db_map = {'1': 'sqlite', '2': 'mysql', '3': 'postgresql'}
    
    if db_choice in db_map:
        db_type = db_map[db_choice]
        
        if db_type == 'sqlite':
            connection = current.get('connection', {}).get('sqlite', {})
            print(f"File database hiện tại: {connection.get('file', 'data/teledrive.db')}")
            db_file = input("File database mới (Enter để giữ nguyên): ").strip()
            
            if db_file:
                config_mgr.update_database_config(db_type, {'file': db_file})
                print("✅ Đã cập nhật cấu hình database!")
        else:
            print(f"Cấu hình {db_type} cần thêm thông tin chi tiết...")
            print("Tính năng này sẽ được bổ sung trong phiên bản sau!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def setup_notifications(config_mgr):
    """Setup notifications configuration"""
    print("\n🔔 CẤU HÌNH NOTIFICATIONS")
    print("-" * 35)
    
    current = config_mgr.get_config('notifications')
    
    print(f"Notifications: {'✅ Bật' if current.get('enabled') else '❌ Tắt'}")
    enabled = input("Bật notifications? (y/n/Enter để giữ nguyên): ").strip().lower()
    
    if enabled in ['y', 'n']:
        config_mgr.config['notifications']['enabled'] = enabled == 'y'
        
        if enabled == 'y':
            channels = current.get('channels', {})
            desktop = channels.get('desktop', {})
            
            print(f"Desktop notifications: {'✅ Bật' if desktop.get('enabled') else '❌ Tắt'}")
            desktop_enabled = input("Bật desktop notifications? (y/n/Enter để giữ nguyên): ").strip().lower()
            
            if desktop_enabled in ['y', 'n']:
                config_mgr.update_notification_config('desktop', {
                    'enabled': desktop_enabled == 'y',
                    'sound': True,
                    'duration': 5000
                })
        
        if config_mgr.save_config():
            print("✅ Đã cập nhật cấu hình notifications!")
        else:
            print("❌ Lỗi khi lưu cấu hình!")
    else:
        print("ℹ️ Không có thay đổi nào!")

def confirm_reset():
    """Confirm reset configuration"""
    print("\n⚠️ CẢNH BÁO: Reset sẽ xóa toàn bộ cấu hình hiện tại!")
    confirm = input("Bạn có chắc chắn muốn reset? (yes/no): ").strip().lower()
    return confirm == 'yes'

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Đã hủy bởi người dùng!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        sys.exit(1)
