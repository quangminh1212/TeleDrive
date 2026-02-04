# 🔒 Hướng Dẫn Bảo Mật TeleDrive

## 📋 Dành Cho Môi Trường Development (Nick Test)

Hiện tại dự án đang dùng nick test nên chưa cần lo ngại về bảo mật Git history. Tuy nhiên, đây là các best practices cần áp dụng:

### ✅ Đã Thực Hiện

1. **Xóa .env khỏi Git tracking**
   - File `.env` không còn bị track bởi Git
   - Các thay đổi trong `.env` sẽ không bị commit nhầm

2. **Tạo .env.example**
   - Template an toàn không chứa credentials thật
   - Hướng dẫn rõ ràng cho người dùng mới

3. **.gitignore đã cập nhật**
   - `.env` đã có trong .gitignore
   - Tự động bỏ qua khi commit

### 🔐 Bảo Mật File .env Local

Hiện tại file `.env` vẫn tồn tại local và chứa credentials thật để app chạy được.

**Quyền file (khuyến nghị):**
```bash
# Linux/Mac
chmod 600 .env

# Windows (PowerShell)
icacls .env /inheritance:r /grant:r "%USERNAME%:F"
```

### 📝 Khi Deploy Production (Quan Trọng!)

Khi triển khai production với nick thật, BẮT BUỘC phải:

#### 1. Tạo Telegram API Credentials Riêng

**Tại sao quan trọng:**
- Credentials hiện tại là của nick test
- Production cần credentials riêng để:
  - Kiểm soát rate limiting
  - Bảo mật account chính
  - Dễ revoke khi cần

**Các bước:**
1. Truy cập: https://my.telegram.org/apps
2. Đăng nhập bằng **số điện thoại production**
3. Tạo ứng dụng mới:
   - App title: `TeleDrive Production`
   - Short name: `TeleDrive`
   - Platform: `Desktop`
4. Copy API ID và API Hash
5. Cập nhật `.env`:
   ```env
   TELEGRAM_API_ID=<production_api_id>
   TELEGRAM_API_HASH=<production_api_hash>
   TELEGRAM_PHONE=<production_phone>
   ```

#### 2. Sử dụng Environment Variables

**Khuyến nghị cho production:**

Thay vì dùng file `.env`, sử dụng biến môi trường hệ thống:

**Windows:**
```powershell
# Set environment variables
[System.Environment]::SetEnvironmentVariable('TELEGRAM_API_ID', 'your_id', 'User')
[System.Environment]::SetEnvironmentVariable('TELEGRAM_API_HASH', 'your_hash', 'User')
```

**Linux/Mac:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export TELEGRAM_API_ID="your_id"
export TELEGRAM_API_HASH="your_hash"
```

#### 3. Bảo Vệ Session Files

Session files chứa quyền truy cập Telegram account của bạn!

**Vị trí:**
- `data/session.session`
- `data/session_import.session`
- `data/*.session`

**Bảo vệ:**
```bash
# Set quyền chỉ owner đọc/ghi
chmod 600 data/*.session

# Hoặc Windows
icacls data\*.session /inheritance:r /grant:r "%USERNAME%:F"
```

**Backup an toàn:**
```bash
# Mã hóa trước khi backup
gpg -c data/session.session
# Tạo file session.session.gpg (mã hóa)

# Giải mã khi cần
gpg data/session.session.gpg
```

#### 4. Xóa Git History (Nếu Dùng Nick Thật)

Nếu chuyển sang production với nick thật, PHẢI xóa Git history:

```bash
# Option 1: BFG Repo-Cleaner (Nhanh nhất)
git clone --mirror https://github.com/yourusername/TeleDrive.git
java -jar bfg.jar --delete-files .env TeleDrive.git
cd TeleDrive.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force

# Option 2: git filter-repo
pip install git-filter-repo
git filter-repo --path .env --invert-paths
git push --force
```

### 🛡️ Các Lớp Bảo Mật Khác

#### 1. Flask Secret Key

Tạo secret key mạnh:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Thêm vào `.env`:
```env
FLASK_SECRET_KEY=<generated_key_here>
```

#### 2. Database Encryption

Nếu lưu thông tin nhạy cảm trong database, xem xét:
- SQLCipher để mã hóa SQLite database
- Encrypt các trường nhạy cảm trước khi lưu

#### 3. Logging

**Trong production:**
- Tắt debug logs
- Không log credentials, tokens, session IDs
- Sử dụng log rotation

**File:** `app/log.py`
```python
# Production mode
DEBUG = False
LOG_LEVEL = 'WARNING'
```

#### 4. Network Security

- Chỉ bind Flask server lên `127.0.0.1` (không public)
- Sử dụng HTTPS nếu expose ra internet
- Set up firewall rules

### ⚠️ Không Làm Gì Với Nick Test

Vì đây là nick test, bạn **KHÔNG CẦN**:
- ❌ Revoke API credentials hiện tại
- ❌ Xóa Git history
- ❌ Tạo credentials mới ngay
- ❌ Lo lắng về credentials bị lộ

**Lý do:** Nick test không có dữ liệu quan trọng, rủi ro thấp.

### ✅ Checklist Khi Chuyển Production

Khi muốn deploy production với nick thật:

- [ ] Tạo API credentials riêng cho production
- [ ] Cập nhật `.env` với credentials mới
- [ ] Xóa Git history (nếu repo public)
- [ ] Set file permissions cho .env và session files
- [ ] Tắt debug logging
- [ ] Tạo backup mã hóa cho session files
- [ ] Set up monitoring và alerts
- [ ] Review toàn bộ code cho security issues
- [ ] Enable rate limiting
- [ ] Set up proper error handling

### 📚 Tài Liệu Tham Khảo

- Telegram API Best Practices: https://core.telegram.org/api/obtaining_api_id
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Flask Security: https://flask.palletsprojects.com/en/latest/security/

---

**Lưu ý:** File này được tạo sau security audit 2026-02-04. Nếu có thắc mắc về bảo mật, tham khảo file [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md).
