# Elyse Frontend Build Script
# Creates a deployment package with runtime-configurable backend URL

param(
    [switch]$Clean,
    [switch]$CreatePackage
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "   Elyse Frontend Build Script                                  " -ForegroundColor Cyan
Write-Host "   Production Build with Runtime Configuration                  " -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js and npm
Write-Host "[1/6] Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "  OK Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "  OK npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR Node.js or npm not found" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Step 2: Navigate to frontend directory
Write-Host ""
Write-Host "[2/6] Preparing frontend directory..." -ForegroundColor Yellow
$frontendDir = Join-Path $PSScriptRoot "elyse_app-frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "  ERROR Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}
Set-Location $frontendDir
Write-Host "  OK Frontend directory: $frontendDir" -ForegroundColor Green

# Step 3: Install dependencies
Write-Host ""
Write-Host "[3/6] Installing npm dependencies..." -ForegroundColor Yellow
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR npm install failed" -ForegroundColor Red
    Set-Location $PSScriptRoot
    exit 1
}
Write-Host "  OK Dependencies installed" -ForegroundColor Green

# Step 4: Update build ID in environment files
Write-Host ""
Write-Host "[4/6] Updating build ID in environment files..." -ForegroundColor Yellow
$buildId = Get-Date -Format "yyyyMMddHHmmss"

# Update environment.ts
$envPath = Join-Path $frontendDir "src\environments\environment.ts"
$envContent = Get-Content $envPath -Raw
$envContent = $envContent -replace "buildId:\s*'[^']*'", "buildId: '$buildId'"
$envContent | Set-Content $envPath -Encoding UTF8 -NoNewline
Write-Host "  OK Updated environment.ts with Build ID: $buildId" -ForegroundColor Green

# Update environment.prod.ts
$envProdPath = Join-Path $frontendDir "src\environments\environment.prod.ts"
$envProdContent = Get-Content $envProdPath -Raw
$envProdContent = $envProdContent -replace "buildId:\s*'[^']*'", "buildId: '$buildId'"
$envProdContent | Set-Content $envProdPath -Encoding UTF8 -NoNewline
Write-Host "  OK Updated environment.prod.ts with Build ID: $buildId" -ForegroundColor Green

# Step 5: Build production bundle
Write-Host ""
Write-Host "[5/6] Building production bundle..." -ForegroundColor Yellow
npm run build -- --progress=false
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR Build failed" -ForegroundColor Red
    Set-Location $PSScriptRoot
    exit 1
}
Write-Host "  OK Build completed successfully" -ForegroundColor Green

# Step 6: Create deployment package
if ($CreatePackage) {
    Write-Host ""
    Write-Host "[6/6] Creating deployment package..." -ForegroundColor Yellow
    
    # Generate version number (date/time based)
    $version = Get-Date -Format "yyyy.MM.dd-HHmm"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    # Update VERSION-FRONTEND.txt
    $versionFile = Join-Path $PSScriptRoot "VERSION-FRONTEND.txt"
    $version | Out-File -FilePath $versionFile -Encoding UTF8 -NoNewline
    Write-Host "  Version: $version" -ForegroundColor Cyan
    
    $packageName = "Elyse-Frontend-v$version-Deploy-$timestamp"
    $buildOutputDir = Join-Path $PSScriptRoot "build-output"
    
    # Ensure build-output directory exists
    if (-not (Test-Path $buildOutputDir)) {
        New-Item -ItemType Directory -Path $buildOutputDir -Force | Out-Null
    }
    
    # Create temporary package directory
    $packagePath = Join-Path $buildOutputDir $packageName
    New-Item -ItemType Directory -Path $packagePath -Force | Out-Null
    
    # Copy build output
    Write-Host "  Copying build output..." -ForegroundColor Gray
    $distPath = Join-Path $frontendDir "dist\elyse_app-frontend\browser"
    Copy-Item -Path "$distPath\*" -Destination $packagePath -Recurse -Force
    
    # Update config.json to production default (port 5000)
    Write-Host "  Configuring for production..." -ForegroundColor Gray
    $configPath = Join-Path $packagePath "assets\config.json"
    @"
{
  "apiUrl": "http://localhost:5000/api"
}
"@ | Out-File -FilePath $configPath -Encoding UTF8 -Force
    
    # Extract release notes from CHANGELOG
    Write-Host "  Extracting release notes..." -ForegroundColor Gray
    $changelogPath = Join-Path $PSScriptRoot "CHANGELOG-FRONTEND.txt"
    $releaseNotes = ""
    if (Test-Path $changelogPath) {
        $changelogContent = Get-Content $changelogPath -Raw
        # Extract the first version section (latest release)
        if ($changelogContent -match "(?s)Version\s+[\d\.\-]+.*?(?=Version\s+[\d\.\-]+|$)") {
            $releaseNotes = $matches[0].Trim()
        }
    }
    
    # Create RELEASE_NOTES.txt
    if ($releaseNotes) {
        $releaseNotesPath = Join-Path $packagePath "RELEASE_NOTES.txt"
        @"
ELYSE FRONTEND - RELEASE NOTES
===============================

$releaseNotes

For complete change history, see CHANGELOG-FRONTEND.txt in the project root.
"@ | Out-File -FilePath $releaseNotesPath -Encoding UTF8
    }
    
    
    # Copy VERSION file to package
    if (Test-Path $versionFile) {
        Copy-Item $versionFile -Destination $packagePath -Force
    }
    
    # Create README from FRONTEND_README.txt template
    Write-Host "  Creating README..." -ForegroundColor Gray
    $readmeTemplatePath = Join-Path $PSScriptRoot "FRONTEND_README.txt"
    if (Test-Path $readmeTemplatePath) {
        $buildDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $readmeContent = Get-Content $readmeTemplatePath -Raw
        $readmeContent = $readmeContent -replace '\{\{VERSION\}\}', $version
        $readmeContent = $readmeContent -replace '\{\{BUILD_DATE\}\}', $buildDate
        $readmeContent | Out-File -FilePath "$packagePath\README.txt" -Encoding UTF8 -Force
        Write-Host "    OK README.txt created from FRONTEND_README.txt" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: FRONTEND_README.txt not found - README.txt will not be included" -ForegroundColor Yellow
    }
    
    # Copy deployment guide files
    Write-Host "  Copying deployment guide files..." -ForegroundColor Gray
    $deployGuideFiles = @("01_DOMAIN_SETUP.txt", "03_KCD_CONFIGURATION.txt")
    foreach ($guideFile in $deployGuideFiles) {
        $guideFilePath = Join-Path $PSScriptRoot $guideFile
        if (Test-Path $guideFilePath) {
            Copy-Item -Path $guideFilePath -Destination $packagePath -Force
            Write-Host "    OK $guideFile included" -ForegroundColor Green
        } else {
            Write-Host "    WARNING: $guideFile not found - will not be included" -ForegroundColor Yellow
        }
    }
    
    # Create ZIP file
    Write-Host "  Creating ZIP archive..." -ForegroundColor Gray
    $zipPath = Join-Path $buildOutputDir "$packageName.zip"
    Compress-Archive -Path "$packagePath\*" -DestinationPath $zipPath -Force
    
    # Clean up temporary directory
    Remove-Item $packagePath -Recurse -Force
    
    # Display summary
    $zipSize = [math]::Round((Get-Item $zipPath).Length/1MB, 2)
    Write-Host ""
    Write-Host "  OK Deployment package created" -ForegroundColor Green
    Write-Host "     Location: $zipPath" -ForegroundColor Cyan
    Write-Host "     Size: $zipSize MB" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[6/6] Skipping package creation (use -CreatePackage to create ZIP)" -ForegroundColor Yellow
}

# Return to original directory
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "BUILD COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend build output: .\elyse_app-frontend\dist\elyse_app-frontend\browser\" -ForegroundColor Cyan
if ($CreatePackage) {
    Write-Host "Deployment package: .\build-output\Elyse-Frontend-Deploy-*.zip" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Configuration: Runtime-configurable via assets/config.json" -ForegroundColor Yellow
    Write-Host "No rebuild required to change backend URL" -ForegroundColor Green
}
Write-Host ""
