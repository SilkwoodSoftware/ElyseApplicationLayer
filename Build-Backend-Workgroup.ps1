# Create WORKGROUP Deployment Package
# Generate version number (date/time based)
$version = Get-Date -Format "yyyy.MM.dd-HHmm"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Update VERSION-BACKEND.txt
$versionFile = ".\VERSION-BACKEND.txt"
$version | Out-File -FilePath $versionFile -Encoding UTF8 -NoNewline
Write-Host "Version: $version" -ForegroundColor Cyan

$WorkgroupPackage = "Elyse-Backend-v$version-WORKGROUP-Deploy-$timestamp"
$buildOutputDir = ".\build-output"

# Ensure build output directory exists
if (-not (Test-Path $buildOutputDir)) {
    New-Item -ItemType Directory -Path $buildOutputDir -Force | Out-Null
}

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "Building Backend - Single-File Self-Contained (WORKGROUP)" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# Navigate to backend directory
Push-Location ".\elyse_asp-backend"

try {
    Write-Host "[1/4] Updating build ID..." -ForegroundColor Yellow
    $buildId = Get-Date -Format "yyyyMMddHHmmss"
    $csprojPath = "elyse_asp-backend.csproj"
    $csprojContent = Get-Content $csprojPath -Raw
    $csprojContent = $csprojContent -replace '<_Parameter2>PLACEHOLDER_BUILD_ID</_Parameter2>', "<_Parameter2>$buildId</_Parameter2>"
    $csprojContent | Set-Content $csprojPath -Encoding UTF8 -NoNewline
    Write-Host "  OK Build ID set to: $buildId`n" -ForegroundColor Green
    
    Write-Host "[2/4] Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore
    if ($LASTEXITCODE -ne 0) {
        throw "Package restore failed"
    }
    Write-Host "  OK Packages restored`n" -ForegroundColor Green

    Write-Host "[3/4] Building and publishing single-file executable..." -ForegroundColor Yellow
    Write-Host "  Mode: Self-contained (includes .NET runtime)" -ForegroundColor Gray
    Write-Host "  Target: Windows x64" -ForegroundColor Gray
    Write-Host "  Output: Single executable file (~128 MB)`n" -ForegroundColor Gray
    
    dotnet publish -c Release -r win-x64 --self-contained true `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -o "..\$buildOutputDir\elyse-backend-workgroup"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "  OK Build successful!`n" -ForegroundColor Green

    Write-Host "[4/4] Verifying build output..." -ForegroundColor Yellow
    $exePath = "..\$buildOutputDir\elyse-backend-workgroup\elyse_asp-backend.exe"
    if (Test-Path $exePath) {
        $exeSize = (Get-Item $exePath).Length
        $exeSizeMB = [math]::Round($exeSize / 1MB, 2)
        Write-Host "  OK elyse_asp-backend.exe - $exeSizeMB MB`n" -ForegroundColor Green
    } else {
        throw "Build output not found: $exePath"
    }
} catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $buildFailed = $true
} finally {
    # Revert build ID back to placeholder so the .csproj is not left with a hardcoded value
    Write-Host "`n  Reverting build ID to placeholder..." -ForegroundColor Gray
    $csprojRevert = Get-Content $csprojPath -Raw
    $csprojRevert = $csprojRevert -replace "<_Parameter2>$buildId</_Parameter2>", '<_Parameter2>PLACEHOLDER_BUILD_ID</_Parameter2>'
    $csprojRevert | Set-Content $csprojPath -Encoding UTF8 -NoNewline
    Write-Host "  OK Build ID reverted to PLACEHOLDER_BUILD_ID" -ForegroundColor Green
    Pop-Location
}

if ($buildFailed) {
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "BUILD COMPLETED - Creating Deployment Package" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# Clean up unnecessary files from build output
# Single-file publish creates extra files that aren't needed for deployment
Write-Host "Cleaning up unnecessary files from build output..." -ForegroundColor Yellow
Remove-Item "$buildOutputDir\elyse-backend-workgroup\*.pdb" -ErrorAction SilentlyContinue
Remove-Item "$buildOutputDir\elyse-backend-workgroup\appsettings.json" -ErrorAction SilentlyContinue
Remove-Item "$buildOutputDir\elyse-backend-workgroup\web.config" -ErrorAction SilentlyContinue
Remove-Item "$buildOutputDir\elyse-backend-workgroup\LICENSE" -ErrorAction SilentlyContinue

# Create temporary package directory
New-Item -ItemType Directory -Path "$buildOutputDir\$WorkgroupPackage" -Force | Out-Null

# Copy single-file executable
Copy-Item -Path "$buildOutputDir\elyse-backend-workgroup\elyse_asp-backend.exe" `
          -Destination "$buildOutputDir\$WorkgroupPackage\" -Force

# Create .env template for workgroup (from production template with workgroup overrides)
Write-Host "  Creating .env template..." -ForegroundColor Gray
$templateSource = "elyse_asp-backend\.env.production.template"
if (Test-Path $templateSource) {
    $envContent = Get-Content $templateSource -Raw
    # Apply workgroup-specific overrides
    $envContent = $envContent -replace '(?m)^(# Production Environment Configuration Template)', '# Workgroup Environment Configuration Template'
    $envContent = $envContent -replace '(?m)^(# Set USE_KCD=true for production domain environment with Kerberos Constrained Delegation)', '# Set USE_KCD=false for workgroup deployments (no Kerberos/domain)'
    $envContent = $envContent -replace '(?m)^(# This enables user impersonation - SQL Server sees the authenticated end user, not the service account)', '# Workgroup mode: backend connects to SQL Server as the local user account'
    $envContent = $envContent -replace '(?m)^USE_KCD=true', 'USE_KCD=false'
    $envContent = $envContent -replace '(?m)^(# Production: Use http://0\.0\.0\.0:5000 to accept connections from frontend VM)', '# Workgroup: Use localhost binding for maximum security'
    $envContent = $envContent -replace '(?m)^(# This binds to all network interfaces, allowing the frontend VM to connect)', '# This binds to localhost only - frontend runs on the same machine'
    $envContent = $envContent -replace '(?m)^SERVER_URLS=http://0\.0\.0\.0:5000', 'SERVER_URLS=http://localhost:5000'
    $envContent | Out-File "$buildOutputDir\$WorkgroupPackage\.env.template" -Encoding UTF8 -Force
    Write-Host "    OK .env.template created from production template (with workgroup overrides)" -ForegroundColor Green
} else {
    Write-Host "    WARNING: $templateSource not found - creating basic .env.template" -ForegroundColor Yellow
    @"
# .env Configuration for WORKGROUP Environment
# Important: Set USE_KCD=false for workgroup deployments

# Database Configuration
DB_TYPE=mssql
DB_HOST=YOUR_SQL_SERVER_NAME_OR_IP
DB_PORT=1433
DB_NAME=Elyse_DB
DB_SYNCHRONIZE=false
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Authentication Mode
# Critical: Must be false for workgroup (no Windows Authentication/KCD)
USE_KCD=false

# Server Configuration
# Kestrel will listen on this URL
# RECOMMENDED: Use localhost binding for maximum security
SERVER_URLS=http://localhost:5000

# Application Role Passwords (from SQL Server)
CONFIGURATOR_PASSWORD=
READER_PASSWORD=
REVIEWER_PASSWORD=
CONTROLLER_PASSWORD=
EDITOR_PASSWORD=
AUTHORISER_PASSWORD=
"@ | Out-File "$buildOutputDir\$WorkgroupPackage\.env.template" -Encoding UTF8 -Force
}

# Extract release notes from CHANGELOG
Write-Host "Extracting release notes..." -ForegroundColor Yellow
$changelogPath = ".\CHANGELOG-BACKEND.txt"
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
    $releaseNotesPath = "$buildOutputDir\$WorkgroupPackage\RELEASE_NOTES.txt"
    @"
ELYSE BACKEND (WORKGROUP) - RELEASE NOTES
==========================================

$releaseNotes

For complete change history, see CHANGELOG-BACKEND.txt in the project root.
"@ | Out-File -FilePath $releaseNotesPath -Encoding UTF8
}


# Copy VERSION file to package
if (Test-Path $versionFile) {
    Copy-Item $versionFile -Destination "$buildOutputDir\$WorkgroupPackage\" -Force
}

# Create README from WORKGROUP_README.txt template
$readmeTemplatePath = ".\WORKGROUP_README.txt"
if (Test-Path $readmeTemplatePath) {
    $buildDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $readmeContent = Get-Content $readmeTemplatePath -Raw
    $readmeContent = $readmeContent -replace '\{\{VERSION\}\}', $version
    $readmeContent = $readmeContent -replace '\{\{BUILD_DATE\}\}', $buildDate
    $readmeContent | Out-File "$buildOutputDir\$WorkgroupPackage\README.txt" -Encoding UTF8 -Force
    Write-Host "  OK README.txt created from WORKGROUP_README.txt" -ForegroundColor Green
} else {
    Write-Host "  WARNING: WORKGROUP_README.txt not found - README.txt will not be included" -ForegroundColor Yellow
}

# Copy deployment guide files
Write-Host "Copying deployment guide files..." -ForegroundColor Yellow
$deployGuideFiles = @("01_DOMAIN_SETUP.txt", "03_KCD_CONFIGURATION.txt")
foreach ($guideFile in $deployGuideFiles) {
    if (Test-Path ".\$guideFile") {
        Copy-Item -Path ".\$guideFile" -Destination "$buildOutputDir\$WorkgroupPackage\" -Force
        Write-Host "  OK $guideFile included" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: $guideFile not found - will not be included" -ForegroundColor Yellow
    }
}

# Create ZIP file
$zipPath = Join-Path $buildOutputDir "$WorkgroupPackage.zip"
Compress-Archive -Path "$buildOutputDir\$WorkgroupPackage\*" `
                 -DestinationPath $zipPath -Force

# Clean up temporary directory
Remove-Item "$buildOutputDir\$WorkgroupPackage" -Recurse -Force

# Clean up build output directory (no longer needed after packaging)
Write-Host "Cleaning up build output directory..." -ForegroundColor Yellow
Remove-Item "$buildOutputDir\elyse-backend-workgroup" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`nWorkgroup deployment package created: $zipPath" -ForegroundColor Green
Write-Host "Package type: Single-file self-contained (~52 MB compressed, ~128 MB uncompressed)" -ForegroundColor Yellow
Write-Host "Contents: elyse_asp-backend.exe + .env.template + README.txt + 01_DOMAIN_SETUP.txt + 03_KCD_CONFIGURATION.txt" -ForegroundColor Yellow
Write-Host "Target: Windows 10/11 Workgroup environments" -ForegroundColor Yellow
Write-Host "NO .NET Runtime required on target machine" -ForegroundColor Green
Write-Host "`nFinal output: one ZIP file in build-output/" -ForegroundColor Cyan
