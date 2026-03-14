# 紧急恢复指南

## 鼠标/键盘被锁定？

如果 OpenOxygen 测试导致鼠标或键盘无法操作：

### 方法 1: 快捷键 (如果键盘可用)
```
Ctrl + Shift + Esc
```
这会触发紧急停止。

### 方法 2: 远程/SSH 执行
```powershell
# 停止所有 Node 进程
Get-Process -Name "node" | Stop-Process -Force

# 重置鼠标位置
[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(960, 540)
```

### 方法 3: 硬重启
如果以上方法无效：
1. 按 `Ctrl + Alt + Delete`
2. 选择任务管理器
3. 结束 `node.exe` 进程
4. 如果仍无效，强制关机重启

## 预防措施

已在 `src/input/safety.ts` 中添加：
- 最大连续操作数限制 (10)
- 操作间隔限制 (100ms)
- 自动释放超时 (5s)
- 紧急停止热键
- 安全区域检查

## 报告问题

如果频繁遇到锁定问题，请记录：
1. 执行的操作
2. 屏幕分辨率
3. Windows 版本
4. 是否使用了多显示器
