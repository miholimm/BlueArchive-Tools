[CmdletBinding()]
param(
  [string]$Source = (Split-Path -Parent $PSScriptRoot | Split-Path -Parent),
  [string]$Output = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  throw "[deploy] $Message"
}

$kit = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$sourceRoot = (Resolve-Path -LiteralPath $Source).Path
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'package.json')) -and (Test-Path -LiteralPath (Join-Path $kit 'source\package.json'))) {
  $sourceRoot = (Resolve-Path -LiteralPath (Join-Path $kit 'source')).Path
}
$outputRoot = [IO.Path]::GetFullPath($Output)

foreach ($required in @('package.json', 'pnpm-lock.yaml', 'server/server.mjs', 'src')) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $required))) {
    Fail "源码目录不完整，缺少 $required"
  }
}

$sourceTarget = [IO.Path]::GetFullPath((Join-Path $kit 'source'))
$pathSeparator = [IO.Path]::DirectorySeparatorChar
if (-not $sourceTarget.StartsWith("$kit$pathSeparator", [StringComparison]::OrdinalIgnoreCase)) {
  Fail 'Portable source target is outside the deployment kit'
}
$temporary = Join-Path $kit ('.source-stage-' + [guid]::NewGuid().ToString('N'))
$previous = $null
New-Item -ItemType Directory -Path $temporary | Out-Null
New-Item -ItemType Directory -Path (Join-Path $temporary 'server') | Out-Null

$items = @(
  'package.json',
  'pnpm-lock.yaml',
  'index.html',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'src',
  'server/lib',
  'server/settings.json',
  'scripts'
)

foreach ($item in $items) {
  Copy-Item -LiteralPath (Join-Path $sourceRoot $item) -Destination (Join-Path $temporary $item) -Recurse
}

Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'server') -File -Filter '*.mjs' | Copy-Item -Destination (Join-Path $temporary 'server')
Copy-Item -LiteralPath (Join-Path $kit 'Dockerfile') -Destination (Join-Path $temporary 'Dockerfile')
Set-Content -LiteralPath (Join-Path $temporary '.dockerignore') -Value "node_modules`ndist`n.env`n.env.*`nserver/data`n*.log`n" -NoNewline -Encoding ascii

if (Test-Path -LiteralPath $sourceTarget) {
  $sourceNodeModules = [IO.Path]::GetFullPath((Join-Path $sourceTarget 'node_modules'))
  if (-not $sourceNodeModules.StartsWith("$sourceTarget$pathSeparator", [StringComparison]::OrdinalIgnoreCase)) {
    Fail 'Portable dependency target is outside the generated source directory'
  }
  if (Test-Path -LiteralPath $sourceNodeModules) {
    Remove-Item -LiteralPath $sourceNodeModules -Recurse -Force
  }
  $previous = "$sourceTarget.previous.$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
  Move-Item -LiteralPath $sourceTarget -Destination $previous
}
Move-Item -LiteralPath $temporary -Destination $sourceTarget

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$archive = Join-Path $outputRoot "blue-archive-portable-deployment-$timestamp.zip"

$temporaryCopy = Join-Path ([IO.Path]::GetTempPath()) ('blue-archive-portable-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporaryCopy | Out-Null
$portableCopy = Join-Path $temporaryCopy 'portable-deployment'
New-Item -ItemType Directory -Path $portableCopy | Out-Null
$staticItems = @(
  '.env.example',
  '.gitignore',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.postgres.yml',
  'README.md',
  'nginx',
  'scripts',
  'systemd'
)
foreach ($item in $staticItems) {
  Copy-Item -LiteralPath (Join-Path $kit $item) -Destination (Join-Path $portableCopy $item) -Recurse
}
$sourceCopy = Join-Path $portableCopy 'source'
New-Item -ItemType Directory -Path $sourceCopy | Out-Null
Get-ChildItem -LiteralPath $sourceTarget -Force | Copy-Item -Destination $sourceCopy -Recurse
Compress-Archive -LiteralPath (Join-Path $temporaryCopy 'portable-deployment') -DestinationPath $archive -CompressionLevel Optimal
Remove-Item -LiteralPath $temporaryCopy -Recurse -Force

$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$archive.sha256" -Value "$hash  $([IO.Path]::GetFileName($archive))" -NoNewline -Encoding ascii
Write-Output "[deploy] 已创建便携部署包：$archive"
Write-Output "[deploy] 已创建校验文件：$archive.sha256"
if ($previous) {
  Write-Output "[deploy] 上一份源码快照保留在：$previous"
}
