Get-ChildItem -Path 'D:\Coding\OpenOxygen\src' -Filter '*.ts' -Recurse | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    $content = $content -replace '鈥\?', '-'
    $content = $content -replace '鈥', '-'
    $content = $content -replace '€', '-'
    Set-Content $file $content
}
Write-Host "Encoding fix complete!"
