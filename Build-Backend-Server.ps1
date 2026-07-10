param(
    [string]$OutputPath = ".\build-output\elyse-backend",
    [switch]$Clean,
    [switch]$CreatePackage,
    [string]$Configuration = "Release"
)

# If CreatePackage is specified, use a temporary build location
if ($CreatePackage) {
    $OutputPath = ".\build-output\.temp-build"
}

$ErrorActionPreference = "Stop"

# Banner
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "   Elyse Backend Build Script                                   " -ForegroundColor Cyan
Write-Host "   Framework-Dependent Build for IIS Deployment                 " -ForegroundColor Cyan
Write-Host "                                                                " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Verify we're in the correct directory
if (-not (Test-Path "elyse_asp-backend\elyse_asp-backend.csproj")) {
    Write-Host "Error: elyse_asp-backend.csproj not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check for .NET SDK
Write-Host "`n[1/6] Checking .NET SDK..." -ForegroundColor Yellow
try {
    $dotnetVersion = dotnet --version
    Write-Host "  OK .NET SDK version: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR .NET SDK not found!" -ForegroundColor Red
    Write-Host "  Please install .NET 8.0 SDK from: https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Yellow
    exit 1
}

# Clean output directory if requested
if ($Clean -and (Test-Path $OutputPath)) {
    Write-Host "`n[2/6] Cleaning output directory..." -ForegroundColor Yellow
    Remove-Item -Path $OutputPath -Recurse -Force
    Write-Host "  OK Cleaned: $OutputPath" -ForegroundColor Green
} else {
    Write-Host "`n[2/6] Output directory: $OutputPath" -ForegroundColor Yellow
    if (Test-Path $OutputPath) {
        Write-Host "  WARNING Directory exists (use -Clean to remove)" -ForegroundColor DarkYellow
    }
}

# Navigate to backend directory
Push-Location elyse_asp-backend

try {
    # Update build ID in .csproj
    Write-Host "`n[3/6] Updating build ID..." -ForegroundColor Yellow
    $buildId = Get-Date -Format "yyyyMMddHHmmss"
    $csprojPath = "elyse_asp-backend.csproj"
    $csprojContent = Get-Content $csprojPath -Raw
    $csprojContent = $csprojContent -replace '<_Parameter2>PLACEHOLDER_BUILD_ID</_Parameter2>', "<_Parameter2>$buildId</_Parameter2>"
    $csprojContent | Set-Content $csprojPath -Encoding UTF8 -NoNewline
    Write-Host "  OK Build ID set to: $buildId" -ForegroundColor Green
    
    # Restore NuGet packages
    Write-Host "`n[4/6] Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet restore failed"
    }
    Write-Host "  OK Packages restored" -ForegroundColor Green
    
    # Build and publish (framework-dependent for IIS)
    Write-Host "`n[5/6] Building backend - $Configuration configuration..." -ForegroundColor Yellow
    Write-Host "  Mode: Framework-dependent (requires .NET Runtime on server)" -ForegroundColor Gray
    Write-Host "  Target: Portable (works on any platform with .NET 8 runtime)" -ForegroundColor Gray
    
    # Convert relative path to absolute path from current directory
    $absoluteOutputPath = Join-Path (Get-Location).Path "..\$OutputPath"
    
    $publishArgs = @(
        "publish",
        "-c", $Configuration,
        "--self-contained", "false",
        "-o", $absoluteOutputPath
    )
    
    dotnet @publishArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "dotnet publish failed"
    }
    
    Write-Host "  OK Build successful!" -ForegroundColor Green
    
} catch {
    Write-Host "`n  ERROR Build failed: $_" -ForegroundColor Red
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

# Copy BUILD_INSTRUCTIONS.md to build output
if (Test-Path "BUILD_INSTRUCTIONS.md") {
    Write-Host "`n  Copying BUILD_INSTRUCTIONS.md to build output..." -ForegroundColor Gray
    Copy-Item -Path "BUILD_INSTRUCTIONS.md" -Destination $OutputPath -Force
    Write-Host "    OK BUILD_INSTRUCTIONS.md included in build output" -ForegroundColor Green
}

# Verify build output
Write-Host "`n[6/6] Verifying build output..." -ForegroundColor Yellow

$requiredFiles = @(
    @{Name="elyse_asp-backend.dll"; Description="Main application assembly"},
    @{Name="elyse_asp-backend.exe"; Description="Hosting launcher"},
    @{Name="web.config"; Description="IIS configuration"},
    @{Name="elyse_asp-backend.runtimeconfig.json"; Description="Runtime configuration"}
)

$allFilesPresent = $true
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $OutputPath $file.Name
    if (Test-Path $filePath) {
        $fileSize = (Get-Item $filePath).Length
        Write-Host "  OK $($file.Name) - $($file.Description) - $fileSize bytes" -ForegroundColor Green
    } else {
        Write-Host "  ERROR $($file.Name) - MISSING!" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host "`nBuild completed with missing files!" -ForegroundColor Red
    exit 1
}

# Show build summary
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "BUILD SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$outputSize = (Get-ChildItem -Path $OutputPath -Recurse | Measure-Object -Property Length -Sum).Sum
$outputSizeMB = [math]::Round($outputSize / 1MB, 2)

Write-Host "Configuration:    $Configuration" -ForegroundColor White
Write-Host "Output Path:      $OutputPath" -ForegroundColor White
Write-Host "Total Size:       $outputSizeMB MB" -ForegroundColor White
Write-Host "File Count:       $((Get-ChildItem -Path $OutputPath -Recurse -File).Count)" -ForegroundColor White

# List all files
Write-Host "`nOutput Files:" -ForegroundColor White
Get-ChildItem -Path $OutputPath -File | 
    Sort-Object Length -Descending | 
    Select-Object -First 15 | 
    Format-Table @{
        Label="File"; 
        Expression={$_.Name}; 
        Width=50
    }, @{
        Label="Size"; 
        Expression={"{0:N0} KB" -f ($_.Length / 1KB)}; 
        Width=15; 
        Alignment="Right"
    } -AutoSize

if ((Get-ChildItem -Path $OutputPath -File).Count -gt 15) {
    Write-Host "  ... and $((Get-ChildItem -Path $OutputPath -File).Count - 15) more files" -ForegroundColor Gray
}

# Create deployment package if requested
if ($CreatePackage) {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "CREATING DEPLOYMENT PACKAGE" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    # Generate version number (date/time based)
    $version = Get-Date -Format "yyyy.MM.dd-HHmm"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    # Update VERSION-BACKEND.txt
    $versionFile = ".\VERSION-BACKEND.txt"
    $version | Out-File -FilePath $versionFile -Encoding UTF8 -NoNewline
    Write-Host "Version: $version" -ForegroundColor Cyan
    
    $packageName = "Elyse-Backend-v$version-SERVER-Deploy-$timestamp"
    $packagePath = ".\$packageName"
    
    Write-Host "Package: $packageName" -ForegroundColor White
    
    # Create package directory
    New-Item -ItemType Directory -Path $packagePath -Force | Out-Null
    
    # Copy build output
    Write-Host "  Copying build output..." -ForegroundColor Gray
    Copy-Item -Path "$OutputPath\*" -Destination $packagePath -Recurse
    
    # Copy build instructions
    Write-Host "  Copying build instructions..." -ForegroundColor Gray
    if (Test-Path "BUILD_INSTRUCTIONS.md") {
        Copy-Item -Path "BUILD_INSTRUCTIONS.md" -Destination $packagePath
        Write-Host "    OK BUILD_INSTRUCTIONS.md included" -ForegroundColor Green
    } else {
        Write-Host "    WARNING BUILD_INSTRUCTIONS.md not found" -ForegroundColor Yellow
    }
    
    # Create .env template
    Write-Host "  Creating .env template..." -ForegroundColor Gray
    
    $templateSource = if (Test-Path "elyse_asp-backend\.env.production.template") {
        "elyse_asp-backend\.env.production.template"
    } else {
        $null
    }
    
    if ($templateSource) {
        Copy-Item $templateSource "$packagePath\.env.template"
    } else {
        $envLines = @(
            "# Elyse Backend Configuration File",
            "# CRITICAL: Update ALL values before deployment",
            "",
            "# Database Configuration",
            "DB_TYPE=mssql",
            "DB_HOST=YOUR_SQL_SERVER_NAME",
            "DB_PORT=1433",
            "DB_NAME=YOUR_DATABASE_NAME",
            "DB_SYNCHRONIZE=false",
            "DB_ENCRYPT=true",
            "DB_TRUST_SERVER_CERTIFICATE=true",
            "",
            "# KCD Configuration",
            "# CRITICAL: For SERVER deployments, USE_KCD MUST be true",
            "# The application must ALWAYS connect using user impersonation, never as itself",
            "USE_KCD=true",
            "",
            "# Server Configuration",
            "# For IIS: Use http://localhost:5000",
            "SERVER_URLS=http://localhost:5000",
            "",
            "# Application Role Passwords",
            "# CRITICAL: Replace with actual passwords from SQL Server",
            "CONFIGURATOR_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD",
            "READER_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD",
            "REVIEWER_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD",
            "CONTROLLER_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD",
            "EDITOR_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD",
            "AUTHORISER_PASSWORD=REPLACE_WITH_ACTUAL_PASSWORD"
        )
        $envLines | Set-Content -Path "$packagePath\.env.template" -Encoding UTF8
    }
    
    # Extract release notes from CHANGELOG
    Write-Host "  Extracting release notes..." -ForegroundColor Gray
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
        $releaseNotesPath = "$packagePath\RELEASE_NOTES.txt"
        @"
ELYSE BACKEND (SERVER) - RELEASE NOTES
=======================================

$releaseNotes

For complete change history, see CHANGELOG-BACKEND.txt in the project root.
"@ | Out-File -FilePath $releaseNotesPath -Encoding UTF8
    }
    
    
    # Copy VERSION file to package
    if (Test-Path $versionFile) {
        Copy-Item $versionFile -Destination $packagePath -Force
    }
    
    # Create README from SERVER_README.txt template
    Write-Host "  Creating deployment instructions..." -ForegroundColor Gray
    $readmeTemplatePath = ".\SERVER_README.txt"
    if (Test-Path $readmeTemplatePath) {
        $buildDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $readmeContent = Get-Content $readmeTemplatePath -Raw
        $readmeContent = $readmeContent -replace '\{\{VERSION\}\}', $version
        $readmeContent = $readmeContent -replace '\{\{BUILD_DATE\}\}', $buildDate
        $readmeContent = $readmeContent -replace '\{\{CONFIGURATION\}\}', $Configuration
        $readmeContent | Out-File "$packagePath\README.txt" -Encoding UTF8 -Force
        Write-Host "    OK README.txt created from SERVER_README.txt" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: SERVER_README.txt not found - README.txt will not be included" -ForegroundColor Yellow
    }
    
    # Copy deployment guide files
    Write-Host "  Copying deployment guide files..." -ForegroundColor Gray
    $deployGuideFiles = @("01_DOMAIN_SETUP.txt", "03_KCD_CONFIGURATION.txt")
    foreach ($guideFile in $deployGuideFiles) {
        if (Test-Path ".\$guideFile") {
            Copy-Item -Path ".\$guideFile" -Destination $packagePath -Force
            Write-Host "    OK $guideFile included" -ForegroundColor Green
        } else {
            Write-Host "    WARNING: $guideFile not found - will not be included" -ForegroundColor Yellow
        }
    }
    
    # Create ZIP archive
    Write-Host "  Creating ZIP archive..." -ForegroundColor Gray
    $buildOutputDir = Split-Path -Parent $OutputPath
    if (-not (Test-Path $buildOutputDir)) {
        New-Item -ItemType Directory -Path $buildOutputDir -Force | Out-Null
    }
    $zipPath = Join-Path $buildOutputDir "$packageName.zip"
    Compress-Archive -Path "$packagePath\*" -DestinationPath $zipPath -Force
    
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    
    Write-Host "`nOK Deployment package created!" -ForegroundColor Green
    Write-Host "  Location: $zipPath" -ForegroundColor White
    Write-Host "  Size: $zipSize MB" -ForegroundColor White
    Write-Host "  Output: $buildOutputDir" -ForegroundColor Gray
    
    # Clean up temp directories
    Remove-Item -Path $packagePath -Recurse -Force
    
    # If CreatePackage was used, also clean up the temporary build output
    if ($CreatePackage -and (Test-Path ".\build-output\.temp-build")) {
        Remove-Item -Path ".\build-output\.temp-build" -Recurse -Force
        Write-Host "  Cleaned up temporary build files" -ForegroundColor Gray
    }
    
    # Clean up the elyse-backend build directory (no longer needed after packaging)
    if (Test-Path ".\build-output\elyse-backend") {
        Remove-Item -Path ".\build-output\elyse-backend" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Cleaned up build output directory" -ForegroundColor Gray
    }
    
    Write-Host "`nFinal output: one ZIP file in build-output/" -ForegroundColor Cyan
}

# Final instructions
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if ($CreatePackage) {
    Write-Host "" -ForegroundColor White
    Write-Host "Deployment package ready in build-output folder:" -ForegroundColor White
    Write-Host "  $zipPath" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    Write-Host "To deploy:" -ForegroundColor White
    Write-Host "1. Transfer ZIP file to target server" -ForegroundColor White
    Write-Host "2. Extract to deployment location (for example C:\inetpub\wwwroot\ElyseAPI)" -ForegroundColor White
    Write-Host "3. Create .env file from .env.template with actual credentials" -ForegroundColor White
    Write-Host "4. Configure IIS and SQL Server (see DEPLOY_README.txt and BUILD_INSTRUCTIONS.md)" -ForegroundColor White
    Write-Host "5. Test deployment" -ForegroundColor White
    Write-Host "" -ForegroundColor White
} else {
    Write-Host "" -ForegroundColor White
    Write-Host "Build output ready in: $OutputPath" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "To create deployment package:" -ForegroundColor White
    Write-Host "  .\Build-Backend.ps1 -CreatePackage" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "To deploy manually:" -ForegroundColor White
    Write-Host "1. Copy files from $OutputPath to server" -ForegroundColor White
    Write-Host "2. Create .env file with database and role credentials" -ForegroundColor White
    Write-Host "3. Configure IIS application pool and website" -ForegroundColor White
    Write-Host "4. Configure SQL Server login and permissions" -ForegroundColor White
    Write-Host "" -ForegroundColor White
}

Write-Host "For complete deployment instructions see BUILD_INSTRUCTIONS.md" -ForegroundColor Cyan
Write-Host "`n================================================================" -ForegroundColor Green
Write-Host "BUILD COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green