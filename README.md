# Telegram File Scanner

Quet va lay thong tin tat ca file trong private channel Telegram.

## Cai dat nhanh

1. **Chay setup**: Nhap doi `setup.bat`
2. **Cau hinh so dien thoai**: Nhap doi `config_phone.bat`
3. **Cau hinh chi tiet**: Nhap doi `config.bat` (tuy chon)
4. **Chay scanner**: Nhap doi `run.bat`

## Cai dat thu cong

1. **Chay setup**: Nhap doi `setup.bat`
2. **Chinh sua .env**: Thay `+84xxxxxxxxx` bang so dien thoai that
3. **Chinh sua config.json**: Tuy chinh cau hinh (tuy chon)
4. **Chay scanner**: Nhap doi `run.bat`

## Quan ly cau hinh

### File .env (API Credentials)
```
TELEGRAM_API_ID=21272067
TELEGRAM_API_HASH=b7690dc86952dbc9b16717b101164af3
TELEGRAM_PHONE=+84936374950
```

### File config.json (Cau hinh chi tiet)
- **Telegram**: API credentials, session name
- **Output**: Thu muc, format file (CSV, JSON, Excel)
- **Scanning**: Gioi han message, batch size, loai file
- **Download**: Tao link download, auto download
- **Display**: Hien thi progress, ngon ngu, format ngay
- **Filters**: Loc theo kich thuoc, phan mo rong, ngay thang

### Config Manager
Chay `config.bat` de quan ly cau hinh qua giao dien:
- Xem cau hinh hien tai
- Thay doi cau hinh Telegram API
- Tuy chinh output format
- Cau hinh scanning options
- Dat filter cho file

## Su dung

- **Private channel**: `https://t.me/joinchat/xxxxx` hoac `https://t.me/+xxxxx`
- **Neu da join**: `@channelname`
- **Ket qua**: Luu trong thu muc `output/`

## File structure

```
TeleDrive/
├── setup.bat         # Cai dat dependencies
├── config_phone.bat  # Cau hinh so dien thoai
├── config.bat        # Quan ly cau hinh chi tiet
├── run.bat           # Chay scanner
├── main.py           # Script chinh
├── engine.py         # Engine
├── config.py         # Load cau hinh
├── config_manager.py # Quan ly cau hinh
├── .env              # API credentials
├── config.json       # Cau hinh chi tiet
└── output/           # Ket qua
```

## Loi thuong gap

- **"invalid literal for int()"**: Chua cau hinh .env
- **"Could not find entity"**: Sai ten channel hoac chua join
- **"Python not found"**: Chua cai Python

## Output format

- CSV: Du lieu bang
- Excel: Format dep
- JSON: Du lieu chi tiet
- Simple JSON: Chi ten file + link
