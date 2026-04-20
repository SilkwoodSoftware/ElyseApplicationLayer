Elyse Backend API - Workgroup READ ONLY Deployment Package (Self-Contained)
=============================================================================

Version: {{VERSION}}
Build Date: {{BUILD_DATE}}
Target Environment: Windows 10/11 or Windows Server (Workgroup or Domain)
Deployment Model: Read-only anonymous access (no user authentication)

This is a single-file self-contained executable that includes all .NET runtime
files. No .NET Runtime installation is required on the target machine.

Package Contents:
- elyse_asp-backend.exe  (~128 MB single executable file)
- .env.template          (Configuration template)
- README.txt             (This file)
- RELEASE_NOTES.txt      (Release notes for this version)
- VERSION-BACKEND.txt    (Version identifier)

IMPORTANT - Read-Only Anonymous Access Only:
============================================

This WORKGROUP READ ONLY deployment is a special variant with ALL write,
update, delete, and elevated-privilege endpoints removed from the code. It is
designed to create a read-only, public-facing, anonymous-user interface.

What this means:
- All users are anonymous -- the database sees every connection as the
  service account
- Only the READER application role is used
- All write/update/delete endpoints have been removed from the code
- The .env file only contains READER_PASSWORD (all other role credentials
  and their corresponding endpoints do not exist in this variant)
- USE_KCD=false (no Kerberos Constrained Delegation)
- Backend runs as a Windows Service under a dedicated service account

Key Differences from Standard WORKGROUP:

    Characteristic      Standard WORKGROUP          WORKGROUP READ ONLY
    --------------      ------------------          -------------------
    Users               Single authenticated user   Anonymous (all seen as service account)
    Application roles   All 6 roles in .env         READER only (READER_PASSWORD in .env)
    Write operations    Full read/write             All write endpoints removed from code
    SQL Server login    User's Windows account      Dedicated service account
    Onboarding          User must self-onboard      Service account must NOT be onboarded
    Bootstrapping       Required (assign roles)     Not required
    Coexistence         Standalone                  May run alongside SERVER or WORKGROUP
                                                    backends on the same database

CRITICAL SECURITY NOTES:
- The read-only service account must NOT be onboarded into the database
  via the application.
- The service account connects to SQL Server as itself and activates only
  the READER application role via sp_setapprole.
- The service account must have CONNECT permission only -- no additional
  database permissions.
- This variant may connect to a fully operational production database that
  is also served by SERVER or standard WORKGROUP backends. The read-only
  and read-write deployments are separate concerns.


================================================================================
DEPLOYMENT ORDER
================================================================================

A complete Elyse WORKGROUP READ ONLY deployment requires the following steps
in this order. This README covers Step 2. The other steps are covered by the
documents indicated.

    Step  Action                                  Document
    ----  ------                                  --------
     1    Install SQL Server and restore the      02_SQL_SERVER_AND_DATABASE.txt
          Elyse database.                         (in the database package:
                                                  Elyse_DB_*.zip)
          NOTE: Skip the AD group login steps
          (Step 7a-7b) in that document. The
          SQL login for the read-only service
          account is created below in this file.

          NOTE: Step 7d (Service Account
          Restrictions) does not apply to this
          variant. The read-only service account
          MUST have a SQL Server login.

     2    Install the read-only backend.          This file (below).

     3    Install the frontend application.       FRONTEND_README.txt
                                                  (in the frontend package:
                                                  Elyse-Frontend-*-Deploy-*.zip)

    NOTE: Domain Setup (01_DOMAIN_SETUP.txt), KCD Configuration
    (03_KCD_CONFIGURATION.txt), and Bootstrapping
    (04_BOOTSTRAPPING_AND_CONFIGURATION.txt) are NOT required for read-only
    deployments. The read-only service account must NOT be onboarded into
    the database.


Deployment Steps:
=================


Prerequisite: SQL Server Login Configuration
=============================================

Before deploying the backend, a SQL Server administrator must create a Windows
Authentication login for the dedicated service account that will run the
read-only backend.

Important: This is the same process as the standard WORKGROUP SQL login, but
the login is for a dedicated service account rather than a personal user
account. The service account does not need to match the SQL Server service
account.

In Read-Only mode (USE_KCD=false), the backend connects to SQL Server using
Windows Authentication as the service account. All anonymous users are seen
by the database as this single service account.

How Windows Authentication Works:
- Backend service runs as: COMPUTERNAME\ServiceAccount (e.g., WEBSERVER01\svc_elyse_ro)
- SQL Server runs as: Any account (e.g., NT SERVICE\MSSQLSERVER)
- Backend connects using: Windows Authentication (Integrated Security=true)
- SQL Server authenticates: The backend service account (COMPUTERNAME\ServiceAccount)
- Result: Backend can connect regardless of what account SQL Server runs under

SQL Server Configuration Steps (performed by DBA):

1. Identify or create the Windows account that will run the read-only backend
   service.

   Note: This is the account the backend service will run as, NOT the SQL
   Server service account. If deploying on a domain-joined server alongside
   a SERVER backend, you may use a domain service account (e.g.,
   DOMAIN\svc_elyse_ro). If deploying on a workgroup machine, use a local
   account (e.g., COMPUTERNAME\svc_elyse_ro).

2. Create SQL Server login for the read-only service account

   Important: You are creating a login for the backend service account, not
   for the SQL Server service account.

   Method A - Using SQL Script:
   ----------------------------
   Connect to SQL Server using SQL Server Management Studio (SSMS) and run:
   
   USE master;
   GO
   CREATE LOGIN [COMPUTERNAME\ServiceAccount] FROM WINDOWS;
   GO
   
   Replace COMPUTERNAME\ServiceAccount with the read-only service account.
   Example: CREATE LOGIN [WEBSERVER01\svc_elyse_ro] FROM WINDOWS;
   
   This creates a Windows Authentication login that allows the read-only
   backend to connect to SQL Server.

   Method B - Using SSMS GUI:
   --------------------------
   a. Open SQL Server Management Studio (SSMS)
   b. Connect to your SQL Server instance
   c. Expand "Security" in Object Explorer
   d. Right-click "Logins" and select "New Login..."
   e. In the "Login - New" dialog:
      - Click "Search..." button next to "Login name"
      - Click "Locations..." and select the local computer (or domain)
      - Click "Advanced..." button
      - Click "Find Now" button
      - Select the service account from the list
      - Click OK, OK, OK
   f. The login name should now show as: COMPUTERNAME\ServiceAccount
   g. Click OK to create the login

3. Grant database access (minimal permissions - CONNECT only)

   The service account only needs permission to CONNECT to the database.
   Once connected, it can automatically execute sp_setapprole (this is a
   built-in permission for all database users). The READER application role
   provides all actual data permissions.

   Method A - Using SQL Script:
   ----------------------------
   USE [Elyse_DB];
   GO
   CREATE USER [COMPUTERNAME\ServiceAccount] FOR LOGIN [COMPUTERNAME\ServiceAccount];
   GO
   -- User now has CONNECT permission by default
   -- No additional permissions needed - sp_setapprole is automatically available
   
   Replace Elyse_DB with your actual database name if different.
   Replace COMPUTERNAME\ServiceAccount with the actual service account.

   Method B - Using SSMS GUI:
   --------------------------
   a. In SSMS Object Explorer, expand "Databases"
   b. Expand your database (e.g., Elyse_DB)
   c. Expand "Security"
   d. Right-click "Users" and select "New User..."
   e. In the "Database User - New" dialog:
      - User type: Select "SQL user with login"
      - User name: Enter the service account name
      - Login name: Click "..." and select the login created in step 2
      - Default schema: Leave as "dbo"
   f. Click OK to create the user
   
   Critical: Do not grant any additional permissions to this user.
   The user can now:
   - Connect to the database
   - Execute sp_setapprole (automatic permission)
   - Access data through the READER application role (after role activation)

4. READER application role provides all actual permissions

   Critical Security Requirement:
   The service account must have no permissions beyond CONNECT and sp_setapprole.
   Do not grant any of the following to the service account:
   - SELECT, INSERT, UPDATE, DELETE permissions on any tables
   - EXECUTE permissions on stored procedures
   - Membership in any database roles (db_datareader, db_datawriter, etc.)
   - Any other object-level permissions
   
   This is fundamental to the Elyse security architecture. All data access
   permissions are controlled exclusively through the READER application role.

   The read-only backend uses only 1 application role:
   - READER (read-only access to documents)
   
   The backend automatically activates the READER role using sp_setapprole
   for every request. The service account itself has NO direct permissions
   on database objects.

5. Do NOT onboard the service account

   CRITICAL: The read-only service account must NOT be onboarded into the
   database via the application's onboarding process. The onboarding process
   is designed for interactive users in SERVER and standard WORKGROUP
   deployments. The read-only backend does not use onboarding.

Important Notes:
- The read-only service account needs its own SQL Server login
- The login format is COMPUTERNAME\ServiceAccount (workgroup) or
  DOMAIN\ServiceAccount (domain-joined)
- The computer name can be found by running: hostname in Command Prompt
- SQL Server must be configured to accept Windows Authentication
- SQL Server can run under ANY account - it does not need to match the
  backend service account
- Default database name is Elyse_DB (change if your database has a
  different name)
- sp_setapprole permission is automatic - no explicit GRANT needed


NOTE: THE FOLLOWING MUST BE CARRIED OUT FROM AN ADMINISTRATOR ACCOUNT

1. Create Backend Directory

   Open PowerShell as Administrator.
   Copy and paste these commands:
   
   $BackendPath = "C:\ElyseApp\ReadOnlyBackend"
   Write-Host "Creating read-only backend directory: $BackendPath"
   New-Item -ItemType Directory -Path "$BackendPath" -Force
   New-Item -ItemType Directory -Path "$BackendPath\logs" -Force
   
   Expected output:
   - "Creating read-only backend directory: C:\ElyseApp\ReadOnlyBackend"
   - Directory paths will be displayed showing successful creation
   
   Note: Unlike the standard WORKGROUP deployment which uses %LOCALAPPDATA%
   (user-specific), the read-only backend uses a shared system directory
   because it runs as a dedicated service account, not a personal user.

2. Deploy Files
   Using Windows Explorer (File Explorer):
   - Navigate to the extracted deployment package folder
   - Copy elyse_asp-backend.exe to C:\ElyseApp\ReadOnlyBackend\
   - Copy .env.template to C:\ElyseApp\ReadOnlyBackend\
   
   Verify: You should see both files in the backend directory

3. Configure .env File
   Using Notepad or any text editor:
   - Open C:\ElyseApp\ReadOnlyBackend\.env.template
   - Edit the following settings with your actual values:
   
   Critical Settings:
   - DB_HOST=YOUR_SQL_SERVER_NAME_OR_IP
     Example: DB_HOST=192.168.1.50 or DB_HOST=SQLSERVER01\SQLEXPRESS
   - DB_NAME=Elyse_DB
     (This is the default database name - change if your database has a
     different name)
   - USE_KCD=false (Required - do not change)
   - READER_PASSWORD=actual_password_here
     (Get this from your DBA - must match the READER application role
     password in SQL Server)

   NOTE: This is the ONLY role password in the .env template. All other
   role credentials (CONFIGURATOR, REVIEWER, CONTROLLER, EDITOR, AUTHORISER)
   and their corresponding endpoints do not exist in this variant.

   Port Configuration:
   - SERVER_URLS=http://localhost:5000 (default)
   - If running alongside another backend on the same machine, change the
     port to avoid conflicts (e.g., SERVER_URLS=http://localhost:5001)
   
   - Save the file as .env (remove .template from filename)
   - Final filename should be: C:\ElyseApp\ReadOnlyBackend\.env

4. Secure .env File
   Open PowerShell as Administrator.
   Copy and paste these commands (they will secure the .env file):
   
   $BackendPath = "C:\ElyseApp\ReadOnlyBackend"
   Write-Host "Securing .env file..."
   
   # Remove inherited permissions
   icacls "$BackendPath\.env" /inheritance:r
   
   # Grant access only to SYSTEM and Administrators
   icacls "$BackendPath\.env" /grant "NT AUTHORITY\SYSTEM:(M)"
   icacls "$BackendPath\.env" /grant "BUILTIN\Administrators:(M)"
   
   # If using a dedicated service account, also grant it access:
   # icacls "$BackendPath\.env" /grant "COMPUTERNAME\ServiceAccount:(R)"
   
   # Verify permissions
   Write-Host "Current permissions on .env file:"
   icacls "$BackendPath\.env"
   
   Expected output: Should show only NT AUTHORITY\SYSTEM and
   BUILTIN\Administrators with (M) permissions

5. Set Folder Permissions
   Still in PowerShell as Administrator, copy and paste these commands:
   
   $BackendPath = "C:\ElyseApp\ReadOnlyBackend"
   Write-Host "Setting folder permissions..."
   
   # Grant SYSTEM and Administrators read/execute access to backend folder
   icacls "$BackendPath" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)RX" /T
   icacls "$BackendPath" /grant "BUILTIN\Administrators:(OI)(CI)F" /T
   
   # Grant write access to logs folder for the service account
   icacls "$BackendPath\logs" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)M" /T
   
   # If using a dedicated service account:
   # icacls "$BackendPath" /grant "COMPUTERNAME\ServiceAccount:(OI)(CI)RX" /T
   # icacls "$BackendPath\logs" /grant "COMPUTERNAME\ServiceAccount:(OI)(CI)M" /T
   
   Write-Host "Permissions set successfully"
   
   Expected output: "Successfully processed" messages for each folder

6. Grant "Log on as a Service" Permission

   The service account needs "Log on as a service" permission.
   
   Open PowerShell as Administrator and run:
   
   secpol.msc
   
   This opens Local Security Policy. Then:
   1. Navigate to: Local Policies > User Rights Assignment
   2. Double-click "Log on as a service"
   3. Click "Add User or Group"
   4. Click "Advanced..." button
   5. Click "Find Now" button
   6. In the Search results list, select the SERVICE ACCOUNT that will run
      the read-only backend
   7. Click OK, OK, OK to close all dialogs
   8. Close Local Security Policy window
   
   Note: If using LocalSystem, this step is not required.

7. Create Windows Service
   
   First, get the exact service account name.
   Open PowerShell as Administrator and run:
   
   # If using a local account:
   Write-Host "Computer Name: $env:COMPUTERNAME"
   
   # Record the computer name - you'll need it below.
   
   IMPORTANT: If you had previous errors, delete the old service first:
   
   $ServiceName = "ElyseReadOnlyBackend"
   sc.exe stop $ServiceName
   sc.exe delete $ServiceName
   
   (It's OK if these commands fail - it just means the service doesn't
   exist yet)
   
   Create the service. Open PowerShell as Administrator and run:
   
   $BackendPath = "C:\ElyseApp\ReadOnlyBackend"
   $ServiceName = "ElyseReadOnlyBackend"
   $ExePath = "$BackendPath\elyse_asp-backend.exe"
   
   Write-Host "Creating service: $ServiceName"
   Write-Host "Executable path: $ExePath"
   
   # Replace COMPUTERNAME\ServiceAccount with the actual service account
   # Example: WEBSERVER01\svc_elyse_ro or use LocalSystem
   $ServiceUser = "COMPUTERNAME\ServiceAccount"
   $ServicePassword = "SERVICE_ACCOUNT_PASSWORD"
   
   # Create the service
   sc.exe create $ServiceName binPath= "$ExePath" start= auto
   
   # Configure service to run as the specified service account
   sc.exe config $ServiceName obj= "$ServiceUser" password= "$ServicePassword"
   
   # Set service description
   sc.exe description $ServiceName "Elyse Document Management System - Read-Only Backend API"
   
   # Configure service to restart automatically on failure
   sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000
   
   Expected output:
   - "[SC] CreateService SUCCESS" after create command
   - "[SC] ChangeServiceConfig SUCCESS" after config command
   
   Alternative - Use LocalSystem account:
   
   sc.exe config $ServiceName obj= "LocalSystem" password= ""
   
   Note: With LocalSystem, SQL Server will see connections as the computer
   account (COMPUTERNAME$). You will need to create the SQL Server login
   for the computer account instead.

8. Start the Service
   Still in PowerShell as Administrator, run these commands:
   
   Write-Host "Starting ElyseReadOnlyBackend service..."
   sc.exe start ElyseReadOnlyBackend
   
   # Wait for service to start
   Start-Sleep -Seconds 5
   
   # Check service status
   Write-Host "Service status:"
   sc.exe query ElyseReadOnlyBackend
   
   Expected output:
   - "START_PENDING" initially, then "RUNNING" after a few seconds
   - STATE should show "4  RUNNING"
   
   Troubleshooting - If service fails to start:
   
   A. "The service did not start due to logon failure"
      This means the password was incorrect or the account lacks permissions.
      
      Solution 1 - Fix the password:
      1. Stop the service: sc.exe stop ElyseReadOnlyBackend
      2. Re-run the config command with correct password:
         sc.exe config ElyseReadOnlyBackend obj= "ACCOUNT" password= "PASSWORD"
      3. Try starting again: sc.exe start ElyseReadOnlyBackend
      
      Solution 2 - Grant "Log on as a service" right (see Step 6)
      
      Solution 3 - Use Local System account:
      1. sc.exe config ElyseReadOnlyBackend obj= "LocalSystem" password= ""
      2. sc.exe start ElyseReadOnlyBackend
   
   B. "The service did not respond in a timely fashion"
      The service is taking too long to start (usually database connection).
      
      Solution:
      1. Check logs: Get-Content "C:\ElyseApp\ReadOnlyBackend\logs\stdout*.log" -Tail 50
      2. Verify DB_HOST and DB_NAME in .env file
      3. Test SQL Server connectivity:
         Test-NetConnection -ComputerName YOUR_SQL_SERVER -Port 1433
   
   C. Service starts but immediately stops
      Check the logs for the actual error:
      Get-Content "C:\ElyseApp\ReadOnlyBackend\logs\stdout*.log" -Tail 50

9. Verify Deployment
   Open a new PowerShell window.
   
   A. Test the API endpoint:
      Copy and paste this command:
      
      Invoke-WebRequest -Uri "http://localhost:5000/api/eula/read" -UseBasicParsing
      
      Expected output:
      - StatusCode: 200 (means success)
      - Content: JSON data with EULA/license information from your database
      
      If you get an error:
      - "Unable to connect" = Service not running or wrong port
      - "500 Internal Server Error" = Check logs for details
      
      Common database errors:
      - "Login failed for user" = SQL Server login not created for service account
      - "Cannot open database" = Database name incorrect in .env file
      - "The server was not found" = DB_HOST incorrect in .env file
   
   B. Check the application logs:
      Copy and paste this command:
      
      Get-Content "C:\ElyseApp\ReadOnlyBackend\logs\stdout*.log" -Tail 50
      
      Expected output:
      - "Now listening on: http://localhost:5000" or similar
      - "Application started" messages
      - No ERROR or FATAL messages


10. Network Security Configuration (Optional)

   RECOMMENDED (Most Secure): Use localhost-only binding
   -------------------------------------------------------
   The default configuration uses localhost binding (SERVER_URLS=http://localhost:5000).
   This makes it impossible for other computers to connect, even if firewall is off.
   
   Your .env file should have:
   SERVER_URLS=http://localhost:5000
   
   If the frontend is on the same machine, this is the most secure option.
   The frontend's web.config BackEndProxy rule will proxy /api requests to
   http://127.0.0.1:5000.
   
   ALTERNATIVE: Allow network access with firewall rules
   ------------------------------------------------------
   If the frontend is on a different machine, you need to bind to all
   interfaces and use firewall rules to restrict access.
   
   1. Change .env:
      SERVER_URLS=http://0.0.0.0:5000
   
   2. Open PowerShell as Administrator and create firewall rules:
   
      # Block all external access by default
      New-NetFirewallRule -DisplayName "Elyse RO Backend - Block All" `
                          -Direction Inbound `
                          -LocalPort 5000 `
                          -Protocol TCP `
                          -Action Block `
                          -Profile Domain,Private,Public
      
      # Allow access only from the frontend server
      # Replace 192.168.1.100 with the frontend server's IP address
      New-NetFirewallRule -DisplayName "Elyse RO Backend - Allow Frontend" `
                          -Direction Inbound `
                          -LocalPort 5000 `
                          -Protocol TCP `
                          -Action Allow `
                          -RemoteAddress "192.168.1.100" `
                          -Profile Domain,Private
   
   3. Verify firewall rules:
      Get-NetFirewallRule -DisplayName "Elyse RO Backend*" | Format-Table DisplayName, Enabled, Action


SECURITY BEST PRACTICES:
=========================

1. FILE SYSTEM SECURITY
   - .env file readable ONLY by the service account and Administrators
   - Backend directory accessible ONLY by the service account
   - Logs directory writable ONLY by the service account

2. NETWORK SECURITY
   - Use localhost binding (SERVER_URLS=http://localhost:5000) for maximum security
   - Only allow network access if the frontend is on a different machine
   - Use firewall rules to restrict access to the frontend server's IP only
   - NEVER expose the backend to the public internet without additional
     security layers (reverse proxy, TLS, etc.)

3. DATABASE SECURITY
   - Service account has CONNECT permission only -- no direct data permissions
   - All data access is through the READER application role via sp_setapprole
   - USE_KCD=false -- backend connects as the service account
   - Service account must NOT be onboarded into the database
   - Do not grant SELECT, INSERT, UPDATE, DELETE, or any other permissions

4. COEXISTENCE WITH OTHER BACKENDS
   - This read-only backend may connect to the same production database as
     SERVER or standard WORKGROUP backends
   - Use a different port (e.g., 5001) if running on the same machine as
     another backend
   - The read-only and read-write deployments are separate concerns


Service Management:
==================

Start:   Start-Service ElyseReadOnlyBackend
Stop:    Stop-Service ElyseReadOnlyBackend
Restart: Restart-Service ElyseReadOnlyBackend
Status:  Get-Service ElyseReadOnlyBackend


================================================================================
UPDATING TO A NEW RELEASE
================================================================================

When a new version of the read-only backend is released, follow these steps
to update while preserving your configuration.

STEP 1: BACKUP CURRENT VERSION
-------------------------------
Open PowerShell as Administrator:

$BackendPath = "C:\ElyseApp\ReadOnlyBackend"
$BackupPath = "C:\ElyseApp\ReadOnlyBackend_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "Creating backup..."
Copy-Item -Path "$BackendPath" -Destination "$BackupPath" -Recurse -Force
Write-Host "Backup created at: $BackupPath"

This creates a timestamped backup of your current installation.

STEP 2: STOP THE SERVICE
-------------------------
Open PowerShell as Administrator:

$ServiceName = "ElyseReadOnlyBackend"
Stop-Service $ServiceName
Write-Host "Service stopped"

STEP 3: EXTRACT NEW VERSION
----------------------------
1. Extract the new deployment package
   (Elyse-Backend-*-WORKGROUP-READ_ONLY-*.zip)
2. You should see:
   - elyse_asp-backend.exe (new version)
   - .env.template (reference only - do not use)
   - README.txt (new documentation)

STEP 4: REPLACE EXECUTABLE
---------------------------
Using Windows Explorer:

1. Navigate to C:\ElyseApp\ReadOnlyBackend\

2. Delete the OLD elyse_asp-backend.exe

3. Copy the NEW elyse_asp-backend.exe from the extracted package

IMPORTANT: Do NOT replace the .env file - keep your existing .env with
your READER_PASSWORD!

STEP 5: VERIFY .ENV FILE
-------------------------
Open PowerShell as Administrator:

$BackendPath = "C:\ElyseApp\ReadOnlyBackend"
Test-Path "$BackendPath\.env"

Should return: True

If it returns False, you accidentally deleted your .env file. Restore it
from backup:

$BackupPath = "C:\ElyseApp\ReadOnlyBackend_Backup_*"
$LatestBackup = Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item "$LatestBackup\.env" -Destination "$BackendPath\.env"

STEP 6: START THE SERVICE
--------------------------
Open PowerShell as Administrator:

$ServiceName = "ElyseReadOnlyBackend"
Start-Service $ServiceName
Start-Sleep -Seconds 5
Get-Service $ServiceName

Expected output: Status should be "Running"

STEP 7: VERIFY UPDATE
----------------------
Open PowerShell:

Invoke-WebRequest -Uri "http://localhost:5000/api/eula/read" -UseBasicParsing

Expected output: StatusCode 200 with JSON data

If you get an error, check the logs:

Get-Content "C:\ElyseApp\ReadOnlyBackend\logs\stdout*.log" -Tail 50

STEP 8: TEST APPLICATION
-------------------------
1. Open your browser
2. Navigate to the frontend (e.g., http://localhost:8080)
3. Verify that read-only content is accessible

TROUBLESHOOTING: Browser Still Shows Old Frontend
---------------------------------------------------
If your browser is still displaying the old version of the frontend after
updating, this is due to browser caching.

Solution - Hard Refresh (Force Reload):

Google Chrome / Microsoft Edge:
- Windows: Press Ctrl + Shift + R
- Or: Press Ctrl + F5

Mozilla Firefox:
- Windows: Press Ctrl + Shift + R
- Or: Press Ctrl + F5

If hard refresh doesn't work, clear browser cache:
- Press Ctrl + Shift + Delete
- Select "Time range": Last hour
- Check "Cached images and files"
- Click "Clear data"
- Refresh the page (F5)

ROLLBACK IF NEEDED
-------------------
If the new version has issues, rollback to the backup:

1. Stop the service:
   $ServiceName = "ElyseReadOnlyBackend"
   Stop-Service $ServiceName

2. Restore from backup:
   $BackendPath = "C:\ElyseApp\ReadOnlyBackend"
   $BackupPath = "C:\ElyseApp\ReadOnlyBackend_Backup_*"
   $LatestBackup = Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   
   Remove-Item "$BackendPath\elyse_asp-backend.exe" -Force
   Copy-Item "$LatestBackup\elyse_asp-backend.exe" -Destination "$BackendPath\"

3. Start the service:
   Start-Service $ServiceName

CLEANUP OLD BACKUPS
--------------------
After confirming the new version works, you can delete old backups:

$BackupPath = "C:\ElyseApp\ReadOnlyBackend_Backup_*"
Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 2 | Remove-Item -Recurse -Force

This keeps the 2 most recent backups and deletes older ones.


Requirements:
=============

- Windows 10/11 or Windows Server (any edition)
- NO .NET Runtime required (included in executable)
- SQL Server access (port 1433)
- READER application role password from SQL Server
- Windows account with permission to create services (or use LocalSystem)

Important Notes:
================

- This is a self-contained build (no .NET installation needed)
- USE_KCD must be false
- The .exe file is ~128 MB because it includes the full .NET runtime
- Service runs under a dedicated service account (or LocalSystem)
- Logs are written to C:\ElyseApp\ReadOnlyBackend\logs\
- Use localhost binding (SERVER_URLS=http://localhost:5000) for maximum security
- For network access, use firewall rules to restrict access to the frontend IP
- Only READER_PASSWORD is required in the .env file
- All other role credentials and endpoints do not exist in this variant
- The service account must NOT be onboarded into the database
- Bootstrapping is not required for read-only deployments

================================================================================

Do not use this package for authenticated multi-user deployments.
For multi-user Server deployments with Active Directory and KCD, use the
SERVER framework-dependent build.
For single-user workstation deployments, use the standard WORKGROUP build.
