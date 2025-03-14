# TeleDrive Server Startup Script
Write-Host '===================================' -ForegroundColor Cyan
Write-Host '=== KHOI DONG TELEDRIVE SERVER ===' -ForegroundColor Cyan
Write-Host '===================================' -ForegroundColor Cyan
Write-Host ''

# Kiểm tra xem node đã được cài đặt chưa
try {
    $nodeVersion = (node -v)
} catch {
    Write-Host '[LOI] Khong tim thay Node.js! Vui long cai dat Node.js tu https://nodejs.org/' -ForegroundColor Red
    Write-Host ''
    pause
    exit 1
}

# Kiểm tra phiên bản node
$nodeMatch = $nodeVersion -match 'v(\d+)\.(\d+)\.(\d+)'
$nodeMajor = $Matches[1]

# Kiểm tra phiên bản Node.js >= 14
if ([int]$nodeMajor -lt 14) {
    Write-Host '[CANH BAO] Phien ban Node.js qua cu (' + $nodeVersion + ')' -ForegroundColor Yellow
    Write-Host 'Khuyen nghi nang cap len Node.js v14 tro len.' -ForegroundColor Yellow
    Write-Host ''
    $continue = Read-Host 'Ban van muon tiep tuc? (y/n)'
    if ($continue -ne 'y') {
        exit 1
    }
    Write-Host ''
}

# Kiểm tra các thư mục cần thiết
if (-not (Test-Path -Path 'data')) {
    Write-Host 'Tao thu muc data...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Path 'data' | Out-Null
}

if (-not (Test-Path -Path 'uploads')) {
    Write-Host 'Tao thu muc uploads...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Path 'uploads' | Out-Null
}

if (-not (Test-Path -Path 'logs')) {
    Write-Host 'Tao thu muc logs...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Path 'logs' | Out-Null
}

# Kiểm tra file .env
if (-not (Test-Path -Path '.env')) {
    if (Test-Path -Path '.env.example') {
        Write-Host '[THONG BAO] Dang tao file .env tu .env.example...' -ForegroundColor Yellow
        Copy-Item -Path '.env.example' -Destination '.env'
    } else {
        Write-Host '[LOI] Khong tim thay file .env hoac .env.example!' -ForegroundColor Red
        Write-Host 'Vui long tao file .env voi noi dung sau:' -ForegroundColor Red
        Write-Host ''
        Write-Host '# Token bot Telegram'
        Write-Host 'BOT_TOKEN=your_bot_token_here'
        Write-Host ''
        Write-Host '# Port cho web server'
        Write-Host 'PORT=3008'
        Write-Host ''
        Write-Host '# Gioi han kich thuoc file (bytes, 20MB = 20971520)'
        Write-Host 'MAX_FILE_SIZE=20971520'
        Write-Host ''
        pause
        exit 1
    }
}

# Kiểm tra xem đã cài đặt các gói cần thiết chưa
if (-not (Test-Path -Path 'node_modules')) {
    Write-Host '[THONG BAO] Dang cai dat cac goi phu thuoc...' -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[LOI] Khong the cai dat cac goi phu thuoc!' -ForegroundColor Red
        pause
        exit 1
    }
    Write-Host 'Da cai dat cac goi phu thuoc thanh cong.' -ForegroundColor Green
    Write-Host ''
}

# Đồng bộ file trước khi khởi động
Write-Host '[THONG BAO] Dang dong bo file tu thu muc uploads...' -ForegroundColor Yellow
node sync-files.js
Write-Host ''

# Khởi động ứng dụng
Write-Host '[THONG BAO] Khoi dong TeleDrive server...' -ForegroundColor Green
Write-Host ''
Write-Host 'Mo trinh duyet va truy cap http://localhost:3008' -ForegroundColor Cyan
Write-Host 'Nhan Ctrl+C de dung server.' -ForegroundColor Cyan
Write-Host ''
node start-app.js 