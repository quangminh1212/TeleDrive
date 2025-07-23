# PowerShell script de chay TeleDrive khong bi treo
Write-Host "================================================================" -ForegroundColor Green
Write-Host "         TELEDRIVE - KHOI DONG NHANH (KHONG BI TREO)" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""

# Chay TeleDrive trong tien trinh rieng
$process = Start-Process -FilePath "python" -ArgumentList "main.py" -PassThru -NoNewWindow

Write-Host "[OK] TeleDrive da khoi dong voi PID: $($process.Id)" -ForegroundColor Cyan
Write-Host "[INFO] Ban co the dong cua so nay va tiep tuc su dung Cursor" -ForegroundColor Yellow
Write-Host "[INFO] Truy cap web interface tai: http://localhost:3000" -ForegroundColor Yellow
Write-Host "" 