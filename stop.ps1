$processes = Get-Process -Name powershell | Where-Object { $_.CommandLine -like "*AutoCommit.ps1*" }

if ($processes) {
    Write-Host "Đang dừng các tiến trình tự động commit..."
    foreach ($process in $processes) {
        Stop-Process -Id $process.Id -Force
        Write-Host "Đã dừng tiến trình ID: $($process.Id)"
    }
    Write-Host "Đã dừng tất cả tiến trình tự động commit."
} else {
    Write-Host "Không tìm thấy tiến trình tự động commit nào đang chạy."
} 