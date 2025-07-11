# Telegram File Scanner

Quet va lay thong tin tat ca file trong private channel Telegram.

## Cai dat nhanh

1. **Chay setup**: Nhap doi `setup.bat`
2. **Cau hinh so dien thoai**: Nhap doi `config_phone.bat`
3. **Chay scanner**: Nhap doi `run.bat`

## Cai dat thu cong

1. **Chay setup**: Nhap doi `setup.bat`
2. **Chinh sua .env**: Thay `+84xxxxxxxxx` bang so dien thoai that
3. **Chay scanner**: Nhap doi `run.bat`

## Su dung

- **Private channel**: `https://t.me/joinchat/xxxxx` hoac `https://t.me/+xxxxx`
- **Neu da join**: `@channelname`
- **Ket qua**: Luu trong thu muc `output/`

## File structure

```
TeleDrive/
├── setup.bat         # Cai dat
├── config_phone.bat  # Cau hinh so dien thoai
├── run.bat           # Chay scanner
├── main.py           # Script chinh
├── engine.py         # Engine
├── config.py         # Cau hinh
├── .env              # API credentials
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
