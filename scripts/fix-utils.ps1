$content = Get-Content -Path 'D:\Coding\OpenOxygen\src\utils\index.ts' -Raw
$content = $content -replace '鈥\?', '-'
$content = $content -replace '鈥', '-'
$content = $content -replace '€', '-'
Set-Content -Path 'D:\Coding\OpenOxygen\src\utils\index.ts' -Value $content
Write-Host "Fixed utils/index.ts"
