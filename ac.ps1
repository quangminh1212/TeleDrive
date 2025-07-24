$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location -Path $scriptPath

# Kiểm tra xem git đã được cài đặt chưa
$gitCommand = "git"
if (!(Get-Command $gitCommand -ErrorAction SilentlyContinue)) {
    # Thử tìm git trong các vị trí phổ biến
    $possiblePaths = @(
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files (x86)\Git\cmd\git.exe",
        "C:\Git\cmd\git.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $gitCommand = $path
            break
        }
    }
}

# Hàm ghi log
function Write-Log {
    param ([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
    Add-Content -Path "auto_commit_log.txt" -Value "[$timestamp] $message"
}

Write-Log "Bắt đầu theo dõi thay đổi và tự động commit"

# Kiểm tra và thiết lập cấu hình Git nếu cần
try {
    $username = & $gitCommand config --get user.name
    $email = & $gitCommand config --get user.email
    
    if (!$username -or !$email) {
        Write-Log "Thiết lập cấu hình Git ban đầu..."
        if (!$username) {
            & $gitCommand config --local user.name "TeleDrive User"
            Write-Log "Đã thiết lập user.name mặc định"
        }
        if (!$email) {
            & $gitCommand config --local user.email "teledrive@example.com"
            Write-Log "Đã thiết lập user.email mặc định"
        }
    } else {
        Write-Log "Cấu hình Git đã được thiết lập: $username <$email>"
    }
} catch {
    Write-Log "Không thể kiểm tra cấu hình Git: $_"
}

# Biến để lưu thời gian commit cuối
$lastCommitTime = Get-Date

while ($true) {
    try {
        # Kiểm tra trạng thái git
        $status = & $gitCommand status -s
        $currentTime = Get-Date
        
        # Kiểm tra nếu có thay đổi hoặc đã 10 phút kể từ lần commit cuối
        if ($status -and ($currentTime - $lastCommitTime).TotalMinutes -ge 1) {
            # Có thay đổi và đã đủ thời gian
            Write-Log "Phát hiện thay đổi. Đang commit..."
            
            # Add tất cả thay đổi
            & $gitCommand add -A
            
            # Commit với message có timestamp và danh sách file đã thay đổi
            $changedFiles = $status -join ", "
            $commitMessage = "Auto-commit: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " - Changes: $changedFiles"
            & $gitCommand commit -m $commitMessage
            
            Write-Log "Đã commit thành công: $commitMessage"
            $lastCommitTime = $currentTime
        } else {
            if (-not $status) {
                Write-Log "Không có thay đổi nào để commit"
            } elseif (($currentTime - $lastCommitTime).TotalMinutes -lt 1) {
                Write-Log "Có thay đổi nhưng chưa đến thời gian commit. Còn lại: $([math]::Round(1 - ($currentTime - $lastCommitTime).TotalMinutes, 1)) phút"
            }
        }
        
        # Đợi 30 giây trước khi kiểm tra lại
        Start-Sleep -Seconds 30
    }
    catch {
        Write-Log "Lỗi: $_"
        Start-Sleep -Seconds 60
    }
} 