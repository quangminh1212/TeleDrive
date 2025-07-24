# Script tự động commit đơn giản
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $scriptPath

# Hàm ghi log
function Write-Log {
    param ([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
    Add-Content -Path "auto_commit_log.txt" -Value "[$timestamp] $message"
}

Write-Log "Bắt đầu theo dõi thay đổi và tự động commit"

try {
    while ($true) {
        # Kiểm tra trạng thái git
        $status = git status -s
        
        if ($status) {
            # Có thay đổi, thực hiện commit
            Write-Log "Phát hiện thay đổi. Đang commit..."
            
            # Add tất cả thay đổi
            git add -A
            
            # Commit với message có timestamp
            $commitMessage = "Auto-commit: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            git commit -m $commitMessage
            
            Write-Log "Đã commit thành công: $commitMessage"
        } else {
            Write-Log "Không có thay đổi nào để commit"
        }
        
        # Đợi 30 giây trước khi kiểm tra lại
        Start-Sleep -Seconds 30
    }
} catch {
    Write-Log "Lỗi: $_"
    Start-Sleep -Seconds 60
} 