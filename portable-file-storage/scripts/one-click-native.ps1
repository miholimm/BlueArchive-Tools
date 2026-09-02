$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22 or newer is required.' }
$nodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
$envText = Get-Content -Raw -LiteralPath '.env'
if ($envText -match 'FILE_STORAGE_ADMIN_PASSWORD=replace-with-a-long-password') { throw 'Edit .env and set FILE_STORAGE_ADMIN_PASSWORD before starting.' }

npm install --omit=dev
npm run start
