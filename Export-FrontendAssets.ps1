<#
.SYNOPSIS
    Exports help files and CSV assets from the Elyse frontend for deployment without rebuilding.

.DESCRIPTION
    This script collects:
      1. ALL files under elyse_app-frontend\src\assets\help (recursively)
      2. CSV files directly under elyse_app-frontend\src\assets (not recursive, no other file types)

    The collected files are zipped into a single archive that preserves the relative folder
    structure so they can be extracted over the deployed application to update content
    without a full rebuild.

.NOTES
    The output zip is created under the build-output directory.
#>

param(
    [string]$OutputZip = (Join-Path $PSScriptRoot "build-output\Elyse-Frontend-Assets-Update-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Resolve paths ──────────────────────────────────────────────────────────────
$projectRoot   = $PSScriptRoot

# ── Ensure the build-output directory exists ───────────────────────────────────
$buildOutputDir = Join-Path $projectRoot 'build-output'
if (-not (Test-Path $buildOutputDir)) {
    New-Item -ItemType Directory -Path $buildOutputDir -Force | Out-Null
}
$assetsRoot    = Join-Path $projectRoot 'elyse_app-frontend\src\assets'
$helpDir       = Join-Path $assetsRoot  'help'

# Validate that the expected directories exist
if (-not (Test-Path $assetsRoot)) {
    Write-Error "Assets directory not found: $assetsRoot"
    exit 1
}
if (-not (Test-Path $helpDir)) {
    Write-Error "Help directory not found: $helpDir"
    exit 1
}

# ── Create a temporary staging folder that mirrors the relative structure ──────
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) "elyse-asset-export-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

try {
    # ── 1. Copy ALL files from the help directory (recursively) ────────────────
    $helpFiles = Get-ChildItem -Path $helpDir -File -Recurse
    foreach ($file in $helpFiles) {
        # Preserve the path relative to the assets root
        $relativePath = $file.FullName.Substring($assetsRoot.Length).TrimStart('\', '/')
        $destPath     = Join-Path $stagingDir $relativePath
        $destDir      = Split-Path $destPath -Parent

        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item -Path $file.FullName -Destination $destPath -Force
    }
    Write-Host "Collected $($helpFiles.Count) file(s) from the help directory."

    # ── 2. Copy CSV files directly under the assets directory (non-recursive) ──
    $csvFiles = Get-ChildItem -Path $assetsRoot -Filter '*.csv' -File
    foreach ($file in $csvFiles) {
        $relativePath = $file.FullName.Substring($assetsRoot.Length).TrimStart('\', '/')
        $destPath     = Join-Path $stagingDir $relativePath

        Copy-Item -Path $file.FullName -Destination $destPath -Force
    }
    Write-Host "Collected $($csvFiles.Count) CSV file(s) from the assets directory."

    # ── 3. Create the zip archive ──────────────────────────────────────────────
    if (Test-Path $OutputZip) {
        Remove-Item $OutputZip -Force
    }

    # Compress from inside the staging directory so the zip contains paths
    # relative to the assets folder (e.g.  help/content/introduction.md,
    # command-palette.csv, etc.)
    Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $OutputZip -Force

    Write-Host "`nArchive created successfully: $OutputZip"
    Write-Host "Total files included: $($helpFiles.Count + $csvFiles.Count)"
}
finally {
    # ── Clean up the temporary staging folder ──────────────────────────────────
    if (Test-Path $stagingDir) {
        Remove-Item $stagingDir -Recurse -Force
    }
}
