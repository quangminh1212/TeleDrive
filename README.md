# Telegram File Scanner

Quet va lay thong tin tat ca file trong private channel Telegram.

## Cai dat

1. **Chay setup**: Nhap doi `setup.bat`
2. **Cau hinh API**: Chinh sua file `.env`
   - Lay API tu: https://my.telegram.org/apps
   - Dien API_ID, API_HASH, so dien thoai
3. **Chay scanner**: Nhap doi `run.bat`

## Su dung

- **Private channel**: `https://t.me/joinchat/xxxxx` hoac `https://t.me/+xxxxx`
- **Neu da join**: `@channelname`
- **Ket qua**: Luu trong thu muc `output/`

## File structure

```
TeleDrive/
├── setup.bat      # Cai dat
├── run.bat        # Chay scanner  
├── main.py        # Script chinh
├── engine.py      # Engine
├── config.py      # Cau hinh
├── .env           # API credentials
└── output/        # Ket qua
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
