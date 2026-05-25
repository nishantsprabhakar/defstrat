$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$node = if (Test-Path $bundledNode) { $bundledNode } else { "node" }

Start-Process -FilePath $node -ArgumentList "server.mjs" -WorkingDirectory $root -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://localhost:4173"

Write-Host "DefStrat Dashboard is running at http://localhost:4173"
Write-Host "Use Stop DefStrat Dashboard.cmd to stop the local server."
