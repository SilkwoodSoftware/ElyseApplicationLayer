Elyse Backend API - Workgroup Deployment Package (Single-File Self-Contained)
==============================================================================

Version: {{VERSION}}
Build Date: {{BUILD_DATE}}
Target Environment: Windows 10/11 Workstation (Workgroup/Non-Domain)
Deployment Model: Single user on single machine

This is a single-file self-contained executable that includes all .NET runtime files.
No .NET Runtime installation is required on the target machine.

Package Contents:
- elyse_asp-backend.exe  (~128 MB single executable file)
- .env.template          (Configuration template)
- README.txt             (This file)
- RELEASE_NOTES.txt      (Release notes for this version)
- VERSION-BACKEND.txt    (Version identifier)
- 01_DOMAIN_SETUP.txt    (Active Directory configuration - SERVER deployments only)
- 03_KCD_CONFIGURATION.txt (KCD setup - SERVER deployments only)

IMPORTANT - Single User Deployment Only:
=========================================

This WORKGROUP deployment is designed for SINGLE USER on a SINGLE MACHINE only.

What this means:
- One user account on one physical computer
- Backend runs as a Windows Service under that user's account
- SQL Server can be local (on same machine) or on network
- Configuration: DB_HOST=localhost\SQLEXPRESS (local) or SERVERNAME\INSTANCENAME (network)
- Service name: ElyseBackend
- Port: 5000 (default)
- USE_KCD=false (no Kerberos Constrained Delegation)

SECURITY LIMITATION - Cannot Provide User Isolation:
- If multiple people use the same computer (even with different Windows accounts),
  they can potentially access each other's backends
- Windows Firewall cannot provide user-level isolation for localhost connections
- For multi-user scenarios, use the SERVER deployment guide with Active Directory and KCD

For Multi-User Environments:

- SERVER deployment provides true user isolation with Single Sign-On


================================================================================
DEPLOYMENT ORDER
================================================================================

A complete Elyse WORKGROUP deployment requires the following steps in this
order. This README covers Step 2. The other steps are covered by the
documents indicated.

    Step  Action                                  Document
    ----  ------                                  --------
     1    Install SQL Server and restore the      02_SQL_SERVER_AND_DATABASE.txt
          Elyse database.                         (in the database package:
                                                  Elyse_DB_*.zip)
          NOTE: Skip the AD group login steps
          (Step 7a-7b) in that document. The
          SQL login for the workgroup service
          account is created below in this file.

     2    Install the backend application.        This file (below).

     3    Install the frontend application.       FRONTEND_README.txt
                                                  (in the frontend package:
                                                  Elyse-Frontend-*-Deploy-*.zip)

     4    Bootstrap users and configure the       04_BOOTSTRAPPING_AND_CONFIGURATION.txt
          system (onboard the user, assign all    (in the database package:
          roles - follow the single-user path).   Elyse_DB_*.zip)

NOTE: 01_DOMAIN_SETUP.txt and 03_KCD_CONFIGURATION.txt are included in this
package for reference but are NOT required for workgroup deployments. They
apply only to SERVER deployments with Active Directory and KCD.


Deployment Steps:
=================


Prerequisite: SQL Server Login Configuration
=============================================

Before deploying the backend, a SQL Server administrator must create a Windows Authentication
login for the user account that will run the service.

Important: SQL Server can run under any account (Local System, Network Service,
NT SERVICE\MSSQLSERVER, or a dedicated service account). The backend service account
does not need to match the SQL Server service account.

In Workgroup mode (USE_KCD=false), the backend connects to SQL Server using Windows Authentication
as the service account. This is different from SERVER/AD deployments where KCD impersonation is used.

How Windows Authentication Works:
- Backend service runs as: COMPUTERNAME\Username (e.g., DESKTOP-ABC123\JohnDoe)
- SQL Server runs as: Any account (e.g., NT SERVICE\MSSQLSERVER)
- Backend connects using: Windows Authentication (Integrated Security=true)
- SQL Server authenticates: The backend service account (COMPUTERNAME\Username)
- Result: Backend can connect regardless of what account SQL Server runs under

SQL Server Configuration Steps (performed by DBA):

1. Create a Windows account that will run the backend service
      
   Note: This is the account the backend service will run as, NOT the SQL Server service account.

2. Create SQL Server login for the backend service account

   Important: You are creating a login for the backend service account, not for the
   SQL Server service account. SQL Server can run under any account - what matters is
   that the backend service account has a login.

   Method A - Using SQL Script:
   ----------------------------
   Connect to SQL Server using SQL Server Management Studio (SSMS) and run:
   
   USE master;
   GO
   CREATE LOGIN [COMPUTERNAME\Username] FROM WINDOWS;
   GO
   
   Replace COMPUTERNAME\Username with the backend service account (from step 1).
   Example: CREATE LOGIN [DESKTOP-ABC123\JohnDoe] FROM WINDOWS;
   
   This creates a Windows Authentication login that allows the backend service
   to connect to SQL Server, regardless of what account SQL Server itself runs under.

   Method B - Using SSMS GUI:
   --------------------------
   a. Open SQL Server Management Studio (SSMS)
   b. Connect to your SQL Server instance
   c. Expand "Security" in Object Explorer
   d. Right-click "Logins" and select "New Login..."
   e. In the "Login - New" dialog:
      - Click "Search..." button next to "Login name"
      - Click "Locations..." and select the local computer (not a domain)
      - Click "Advanced..." button
      - Click "Find Now" button
      - Select the user account from the list (e.g., JohnDoe)
      - Click OK, OK, OK
   f. The login name should now show as: COMPUTERNAME\Username
   g. Click OK to create the login

3. Grant database access (minimal permissions - CONNECT only)

   The user only needs permission to CONNECT to the database. Once connected, they can
   automatically execute sp_setapprole (this is a built-in permission for all database users).
   All actual data permissions are granted through application roles.

   Method A - Using SQL Script:
   ----------------------------
   USE [Elyse_DB];
   GO
   CREATE USER [COMPUTERNAME\Username] FOR LOGIN [COMPUTERNAME\Username];
   GO
   -- User now has CONNECT permission by default
   -- No additional permissions needed - sp_setapprole is automatically available
   
   Replace Elyse_DB with your actual database name if different.
   Replace COMPUTERNAME\Username with the actual computer name and username.

   Method B - Using SSMS GUI:
   --------------------------
   a. In SSMS Object Explorer, expand "Databases"
   b. Expand your database (e.g., Elyse_DB)
   c. Expand "Security"
   d. Right-click "Users" and select "New User..."
   e. In the "Database User - New" dialog:
      - User type: Select "SQL user with login"
      - User name: Enter the username (e.g., JohnDoe)
      - Login name: Click "..." and select the login created in step 2
      - Default schema: Leave as "dbo"
   f. Click OK to create the user
   
   Critical: Do not grant any additional permissions to this user.
   The user can now:
   - Connect to the database
   - Execute sp_setapprole (automatic permission)
   - Access data through application roles (after role activation)

4. Application roles provide all actual permissions

   Critical Security Requirement:
   The user account must have no permissions beyond CONNECT and sp_setapprole.
   Do not grant any of the following to the user account:
   - SELECT, INSERT, UPDATE, DELETE permissions on any tables
   - EXECUTE permissions on stored procedures
   - Membership in any database roles (db_datareader, db_datawriter, etc.)
   - Any other object-level permissions
   
   This is fundamental to the Elyse security architecture. All data access permissions
   are controlled exclusively through application roles.

   The application uses 6 application roles with passwords (configured in .env file):
   - configurator (full admin access)
   - reader (read-only access)
   - reviewer (review permissions)
   - controller (control permissions)
   - editor (edit permissions)
   - authoriser (authorization permissions)
   
   The backend automatically activates the appropriate role using sp_setapprole based on
   the operation being performed. The user account itself has NO direct permissions on
   database objects - all permissions come from the application roles.
   
   Security model benefits:
   - Users cannot bypass application logic by connecting directly to SQL Server
   - All database access is controlled through the application
   - Permissions are managed centrally through application roles
   - User accounts have only minimal "connect" permission
   - Application roles enforce business logic and access control

Important Notes:
- In Workgroup environments, each backend service account needs its own SQL Server login
- The login format is COMPUTERNAME\Username (not DOMAIN\Username as in AD environments)
- The computer name can be found by running: hostname in Command Prompt
- The username is the Windows account name (not email address)
- SQL Server must be configured to accept Windows Authentication
- SQL Server can run under ANY account - it does not need to match the backend service account
- If using SQL Server Express, ensure it's configured for network access if needed
- Default database name is Elyse_DB (change if your database has a different name)
- sp_setapprole permission is automatic - no explicit GRANT needed

SQL Server Service Account vs Backend Service Account:
- SQL Server service account: The account SQL Server itself runs under (e.g., NT SERVICE\MSSQLSERVER)
- Backend service account: The account the backend service runs under (e.g., COMPUTERNAME\JohnDoe)
- These are DIFFERENT accounts and do not need to match
- The backend connects TO SQL Server using Windows Authentication AS the backend service account
- SQL Server authenticates the backend service account, not its own service account

Comparison with AD/Server Deployment:
- AD/SERVER: One AD group login, all users are members, KCD impersonates each user
- WORKGROUP: Individual logins per backend service account, no impersonation, direct Windows Authentication
- Both use application roles for actual database permissions

Example Configuration:
- SQL Server runs as: NT SERVICE\MSSQLSERVER (or Local System, or any other account)
- Backend service runs as: DESKTOP-ABC123\JohnDoe
- SQL Server login created for: DESKTOP-ABC123\JohnDoe
- Backend connects using: Windows Authentication (Integrated Security=true)
- SQL Server sees connection from: DESKTOP-ABC123\JohnDoe
- Result: Connection succeeds, backend can execute sp_setapprole and access data



NOTE: THE FOLLOWING MUST BE CARRIED OUT FROM WITHIN THE ACCOUNT WHERE THE BACKEND WILL BE HOSTED

1. Create Backend Directory

   Open PowerShell (not as Administrator - run as the regular user)
   Copy and paste these commands:
   
   $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
   Write-Host "Creating backend directory for user: $env:USERNAME"
   Write-Host "Directory: $BackendPath"
   New-Item -ItemType Directory -Path "$BackendPath" -Force
   New-Item -ItemType Directory -Path "$BackendPath\logs" -Force
   
   Expected output:
   - "Creating backend directory for user: YourUsername"
   - "Directory: C:\Users\YourUsername\AppData\Local\ElyseApp\Backend"
   - Directory paths will be displayed showing successful creation
   
   Example: If username is "JohnDoe", directory will be C:\Users\JohnDoe\AppData\Local\ElyseApp\Backend

2. Deploy Files
   Using Windows Explorer (File Explorer):
   - Navigate to the extracted deployment package folder
   - Copy elyse_asp-backend.exe to %LOCALAPPDATA%\ElyseApp\Backend\
   - Copy .env.template to %LOCALAPPDATA%\ElyseApp\Backend\
   
   Note: %LOCALAPPDATA% expands to C:\Users\YourUsername\AppData\Local
   Example: C:\Users\JohnDoe\AppData\Local\ElyseApp\Backend\
   
   Verify: You should see both files in your user-specific backend directory

3. Configure .env File
   Using Notepad or any text editor:
   - Open %LOCALAPPDATA%\ElyseApp\Backend\.env.template
   (This expands to C:\Users\YourUsername\AppData\Local\ElyseApp\Backend\.env.template)
   - Edit the following settings with your actual values:
   
   Critical Settings:
   - DB_HOST=YOUR_SQL_SERVER_NAME_OR_IP
     Example: DB_HOST=192.168.1.50 or DB_HOST=Computer1\SQLSERVER01. 
   - DB_NAME=Elyse_DB
      (This is the default database name - change if your database has a different name)
   - USE_KCD=false (Required - do not change for WORKGROUP)
   - Set all 6 application role passwords (get these from your DBA):
     CONFIGURATOR_PASSWORD=actual_password_here
     READER_PASSWORD=actual_password_here
     REVIEWER_PASSWORD=actual_password_here
     CONTROLLER_PASSWORD=actual_password_here
     EDITOR_PASSWORD=actual_password_here
     AUTHORISER_PASSWORD=actual_password_here

   To confirm the DB_HOST name: open SSMS, under Object Explorer right click the server and select Properties. 

   Port Configuration:
   - SERVER_URLS=http://localhost:5000 (default - most secure)
   - Use localhost binding for maximum security
   
   - Save the file as .env (remove .template from filename)
   - Final filename should be: %LOCALAPPDATA%\ElyseApp\Backend\.env
   (This expands to C:\Users\YourUsername\AppData\Local\ElyseApp\Backend\.env)

4. Secure .env File
   Open PowerShell (as regular user, not as Administrator)
   Copy and paste these commands (they will secure the .env file):
   
   $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
   $CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
   Write-Host "Securing .env file for user: $CurrentUser"
   
   # Remove inherited permissions
   icacls "$BackendPath\.env" /inheritance:r
   
   # Grant access only to current user and SYSTEM
   icacls "$BackendPath\.env" /grant "NT AUTHORITY\SYSTEM:(M)"
   icacls "$BackendPath\.env" /grant "${CurrentUser}:(M)"
   
   # Verify permissions
   Write-Host "Current permissions on .env file:"
   icacls "$BackendPath\.env"
   
   Expected output: Should show only NT AUTHORITY\SYSTEM and your username with (M) permissions

5. Set Folder Permissions
   Still in PowerShell (as regular user), copy and paste these commands:
   
   $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
   $CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
   Write-Host "Setting folder permissions for user: $CurrentUser"
   
   # Grant current user read/execute access to backend folder
   icacls "$BackendPath" /grant "${CurrentUser}`:(OI)(CI)RX" /T
   
   # Grant current user write access to logs folder
   icacls "$BackendPath\logs" /grant "${CurrentUser}`:(OI)(CI)M" /T
   
   Write-Host "
Permissions set successfully"
   
   Expected output: "Successfully processed" messages for each folder

6. Grant "Log on as a Service" Permission
   
   Your account needs "Log on as a service" permission. An administrator must grant this.
   
   Open PowerShell as Administrator and run:
   
   secpol.msc
   
   This opens Local Security Policy. Then:
   1. Navigate to: Local Policies > User Rights Assignment
   2. Double-click "Log on as a service"
   3. Click "Add User or Group"
   4. Click "Advanced..." button
   5. Click "Find Now" button
   6. In the Search results list, select YOUR USER ACCOUNT (the same account you've been using)
      - This is the regular Windows user account (e.g., JohnDoe)
      - Select the same account that owns the backend directory in %LOCALAPPDATA%
      - This is the account that will run the backend service
   7. Click OK, OK, OK to close all dialogs
   8. Close Local Security Policy window
   9. The user must LOG OFF and LOG BACK ON for this to take effect
   
   Critical: After the administrator grants permission, the user must log off Windows
   and log back on. The permission will not work until you do this.
   
   Example: If your Windows username is "JohnDoe", select "JohnDoe" from the list
   (not LOCAL SERVICE or any other system account).

7. Create Windows Service (After logging back on)
   
   First, get your exact computer name and username.
   Open PowerShell (NOT as Administrator - run as regular user) and run:
   
   Write-Host "Computer Name: $env:COMPUTERNAME"
   Write-Host "Username: $env:USERNAME"
   Write-Host "Full Account: $env:COMPUTERNAME\$env:USERNAME"
   
   Example output:
   Computer Name: DESKTOP-ABC123
   Username: JohnDoe
   Full Account: DESKTOP-ABC123\JohnDoe
   
   Record the "Full Account" value - you'll need it in the next step.
   
   IMPORTANT: If you had previous errors, delete the old service first.
   Open PowerShell as Administrator and run:
   
   $ServiceName = "ElyseBackend"
   sc.exe stop $ServiceName
   sc.exe delete $ServiceName
   
   (It's OK if these commands fail - it just means the service doesn't exist yet)
   
   Open PowerShell as Administrator and run these commands:
   
   # IMPORTANT: Replace USERNAME with the actual username from the previous step
   # Example: If username is "JohnDoe", use C:\Users\JohnDoe\AppData\Local\ElyseApp\Backend
   $BackendPath = "C:\Users\USERNAME\AppData\Local\ElyseApp\Backend"
   
   # Service name (standard name for single-user deployment)
   $ServiceName = "ElyseBackend"
   
   $ExePath = "$BackendPath\elyse_asp-backend.exe"
   
   Write-Host "Creating service: $ServiceName"
   Write-Host "Executable path: $ExePath"
   Write-Host "Verify the path exists before proceeding"
   
   # IMPORTANT: Replace with the EXACT values from the previous step
   # Use the "Full Account" value you recorded (e.g., DESKTOP-ABC123\JohnDoe)
   $ServiceUser = "COMPUTERNAME\USERNAME"
   $ServicePassword = "YOUR_WINDOWS_PASSWORD"
   
   Write-Host "Creating service to run as: $ServiceUser"
   Write-Host "Verify this matches the Full Account from the previous step"
   Write-Host "This should be the regular user account (not Administrator)"
   
   # Create the service
   sc.exe create $ServiceName binPath= "$ExePath" start= auto
   
   # Configure service to run as the specified user account
   sc.exe config $ServiceName obj= "$ServiceUser" password= "$ServicePassword"
   
   # Set service description
   sc.exe description $ServiceName "Elyse Document Management System - Backend API"
   
   # Configure service to restart automatically on failure
   sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000
   
   Expected output:
   - "[SC] CreateService SUCCESS" after create command
   - "[SC] ChangeServiceConfig SUCCESS" after config command
   
   Alternative - If you cannot get admin help:
   Use LocalSystem account (works but SQL Server will see connections as SYSTEM):
   
   sc.exe config $ServiceName obj= "LocalSystem" password= ""
   
   Note: With LocalSystem, you may need to configure SQL Server to accept the computer account.

8. Start the Service
   Still in PowerShell as Administrator, run these commands:
   
   Write-Host "Starting ElyseBackend service..."
   sc.exe start ElyseBackend
   
   # Wait for service to start
   Start-Sleep -Seconds 5
   
   # Check service status
   Write-Host "Service status:"
   sc.exe query ElyseBackend
   
   Expected output:
   - "START_PENDING" initially, then "RUNNING" after a few seconds
   - STATE should show "4  RUNNING"
   
   Troubleshooting - If service fails to start:
   
   A. "The service did not start due to logon failure"
      This means the password in Step 7 was incorrect or the account lacks permissions.
      
      Solution 1 - Fix the password:
      1. Stop the service: sc.exe stop ElyseBackend
      2. Re-run the config command with correct password:
         sc.exe config ElyseBackend obj= "YOUR_USERNAME" password= "CORRECT_PASSWORD"
      3. Try starting again: sc.exe start ElyseBackend
      
      Solution 2 - Grant "Log on as a service" right:
      1. Press Win+R, type: secpol.msc, press Enter
      2. Navigate to: Local Policies > User Rights Assignment
      3. Double-click "Log on as a service"
      4. Click "Add User or Group"
      5. Enter your username, click OK
      6. Click OK again
      7. Try starting the service: sc.exe start ElyseBackend
      
      Solution 3 - Use Local System account (less secure):
      If you don't need user-specific SQL Server authentication:
      1. sc.exe config ElyseBackend obj= "LocalSystem" password= ""
      2. sc.exe start ElyseBackend
      Note: This runs as SYSTEM, not your user account
   
   B. "The service did not respond in a timely fashion"
      The service is taking too long to start (usually due to database connection issues).
      
      Solution:
      1. Check logs immediately:
         $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
         Get-Content "$BackendPath\logs\stdout*.log" -Tail 50
      2. Look for database connection errors
      3. Verify DB_HOST and DB_NAME in .env file
      4. Test SQL Server connectivity: Test-NetConnection -ComputerName YOUR_SQL_SERVER -Port 1433
   
   C. Service starts but immediately stops
      Check the logs for the actual error:
      $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
      Get-Content "$BackendPath\logs\stdout*.log" -Tail 50

9. Verify Deployment
   Open a new PowerShell window (as regular user, not as Administrator)
   
   A. Test the API endpoint:
      Copy and paste this command:
      
      Invoke-WebRequest -Uri "http://localhost:5000/api/eula/read" -UseBasicParsing
      
      Expected output:
      - StatusCode: 200 (means success)
      - Content: JSON data with EULA/license information from your database
      
      If you get an error:
      - "Unable to connect" = Service not running or wrong port
      - "401 Unauthorized" = Database authentication issue (check SQL Server login)
      - "500 Internal Server Error" = Check logs for details
      
      Common database authentication errors:
      - "Login failed for user 'COMPUTERNAME\Username'" = SQL Server login not created
      - "Cannot open database" = Database name incorrect in .env file
      - "The server was not found" = DB_HOST incorrect in .env file
   
   B. Check the application logs:
      Copy and paste this command:
      
      $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
      Get-Content "$BackendPath\logs\stdout*.log" -Tail 50
      
      Expected output:
      - "Now listening on: http://localhost:5000" or similar
      - "Application started" messages
      - No ERROR or FATAL messages
      
      If you see errors:
      - Database connection errors = Check DB_HOST, DB_NAME, passwords in .env
      - Permission errors = Check folder permissions in step 5
      - Port already in use = Another application is using port 5000

10. Network Security Configuration (Optional)

   RECOMMENDED (Most Secure): Use localhost-only binding
   -------------------------------------------------------
   The default configuration uses localhost binding (SERVER_URLS=http://localhost:5000).
   This makes it impossible for other computers to connect, even if firewall is off.
   
   Your .env file should have:
   SERVER_URLS=http://localhost:5000
   
   What this does:
   - Backend only accepts connections from 127.0.0.1 (localhost)
   - Other computers on the network cannot connect to your backend
   - No firewall configuration needed
   - This is the MOST SECURE option
   
   Verify your configuration:
   Open %LOCALAPPDATA%\ElyseApp\Backend\.env and check SERVER_URLS line
   (This expands to C:\Users\YourUsername\AppData\Local\ElyseApp\Backend\.env)
   
   If you need to change it:
   Edit .env file and change: SERVER_URLS=http://localhost:5000
   Then restart the service: Restart-Service ElyseBackend
   
   ALTERNATIVE: Allow network access with firewall rules
   ------------------------------------------------------
   If you need to allow other computers to access your backend, follow these steps.
   Warning: Only do this if you understand the security implications!
   
   Open PowerShell as Administrator
   
   A. First: Block all external access by default (security best practice)
      Copy and paste this command:
      
      New-NetFirewallRule -DisplayName "Elyse Backend - Block All" `
                          -Direction Inbound `
                          -LocalPort 5000 `
                          -Protocol TCP `
                          -Action Block `
                          -Profile Domain,Private,Public
      
      Expected output: "Name: Elyse Backend - Block All" and "Enabled: True"
      
      What this does: Blocks ALL incoming connections to port 5000 from any computer
   
   B. Then: Allow access only from specific trusted computers
      You need to know the IP address of the computer that needs access.
      
      To find a computer's IP address:
      - On that computer, open Command Prompt
      - Type: ipconfig
      - Look for "IPv4 Address" (example: 192.168.1.100)
      
      Copy and paste this command, replacing 192.168.1.100 with the actual IP:
      
      New-NetFirewallRule -DisplayName "Elyse Backend - Allow Frontend" `
                          -Direction Inbound `
                          -LocalPort 5000 `
                          -Protocol TCP `
                          -Action Allow `
                          -RemoteAddress "192.168.1.100" `
                          -Profile Domain,Private
      
      Expected output: "Name: Elyse Backend - Allow Frontend" and "Enabled: True"
      
      What this does: Allows only the computer at 192.168.1.100 to connect
      
      To allow multiple computers, run the command again with different IPs:
      - Change "Allow Frontend" to "Allow Frontend 2", "Allow Frontend 3", etc.
      - Change RemoteAddress to each computer's IP
   
   C. Verify firewall rules:
      Copy and paste this command:
      
      Get-NetFirewallRule -DisplayName "Elyse Backend*" | Format-Table DisplayName, Enabled, Action
      
      Expected output: List of your Elyse Backend firewall rules

SECURITY BEST PRACTICES:
=========================

1. FILE SYSTEM SECURITY
   - .env file readable ONLY by the service account (current user)
   - Backend directory accessible ONLY by the service account
   - Logs directory writable ONLY by the service account

2. NETWORK SECURITY
   - Use localhost binding (SERVER_URLS=http://localhost:5000) for maximum security
   - Only allow network access if absolutely necessary
   - Use firewall rules to restrict access to specific IPs if network access is required
   - NEVER expose backend to public internet without additional security layers

3. DATABASE SECURITY
   - Backend connects to SQL Server using Windows Authentication as the service account
   - Database ACLs control what data the user can access
   - Application roles provide operation-level permissions
   - USE_KCD=false means backend connects as the service account (user's Windows account)

IMPORTANT - User Isolation Limitation:
=======================================

This WORKGROUP deployment CANNOT provide secure user isolation:
- If multiple people use the same computer (even with different Windows accounts),
  they can potentially access each other's backends
- Windows Firewall cannot distinguish between users on localhost
- Service names must be unique per machine (not per user)
- Port numbers must be unique per machine (not per user)

For Multi-User Environments:

- SERVER deployment provides true user isolation with Single Sign-On
- Each user connects with their own identity via Kerberos Constrained Delegation

Service Management:
==================

Start:   Start-Service ElyseBackend
Stop:    Stop-Service ElyseBackend
Restart: Restart-Service ElyseBackend
Status:  Get-Service ElyseBackend

================================================================================
UPDATING TO A NEW RELEASE
================================================================================

When a new version of the backend is released, follow these steps to update:

STEP 1: BACKUP CURRENT VERSION
-------------------------------
Open PowerShell (as regular user, not Administrator):

$BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
$BackupPath = "$env:LOCALAPPDATA\ElyseApp\Backend_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "Creating backup..."
Copy-Item -Path "$BackendPath" -Destination "$BackupPath" -Recurse -Force
Write-Host "Backup created at: $BackupPath"

This creates a timestamped backup of your current installation.

STEP 2: STOP THE SERVICE
-------------------------
Option A - Using PowerShell:
Open PowerShell as Administrator:

$ServiceName = "ElyseBackend"
Stop-Service $ServiceName
Write-Host "Service stopped"

Option B - Using Services GUI:
1. Press the Windows key
2. Type: services
3. Right-click "Services" and select "Run as administrator"
4. Scroll down and find "ElyseBackend" in the list
5. Right-click "ElyseBackend" and select "Stop"
6. Wait for the Status column to show blank (service stopped)

STEP 3: EXTRACT NEW VERSION
----------------------------
1. Extract the new deployment package (Elyse-Backend-Deploy-WORKGROUP-*.zip)
2. You should see:
   - elyse_asp-backend.exe (new version)
   - .env.template (reference only - do not use)
   - README.txt (new documentation)

STEP 4: REPLACE EXECUTABLE
---------------------------
Using Windows Explorer:

1. Navigate to %LOCALAPPDATA%\ElyseApp\Backend\
   (This expands to C:\Users\YourUsername\AppData\Local\ElyseApp\Backend\)

2. Delete the OLD elyse_asp-backend.exe

3. Copy the NEW elyse_asp-backend.exe from the extracted package

IMPORTANT: Do NOT replace the .env file - keep your existing .env with your passwords!

STEP 5: VERIFY .ENV FILE
-------------------------
Open PowerShell (as regular user):

$BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
Test-Path "$BackendPath\.env"

Should return: True

If it returns False, you accidentally deleted your .env file. Restore it from backup:

$BackupPath = "$env:LOCALAPPDATA\ElyseApp\Backend_Backup_*"
$LatestBackup = Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item "$LatestBackup\.env" -Destination "$BackendPath\.env"

STEP 6: START THE SERVICE
--------------------------
Option A - Using PowerShell:
Open PowerShell as Administrator:

$ServiceName = "ElyseBackend"
Start-Service $ServiceName
Start-Sleep -Seconds 5
Get-Service $ServiceName

Expected output: Status should be "Running"

Option B - Using Services GUI:
1. Press the Windows key
2. Type: services
3. Right-click "Services" and select "Run as administrator"
4. Scroll down and find "ElyseBackend" in the list
5. Right-click "ElyseBackend" and select "Start"
6. Wait for the Status column to show "Running"

STEP 7: VERIFY UPDATE
----------------------
Open PowerShell (as regular user):

Invoke-WebRequest -Uri "http://localhost:5000/api/eula/read" -UseBasicParsing

Expected output: StatusCode 200 with JSON data

If you get an error, check the logs:

$BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
Get-Content "$BackendPath\logs\stdout*.log" -Tail 50

STEP 8: TEST APPLICATION
-------------------------
1. Open your browser
2. Navigate to the frontend (e.g., http://localhost:8080)
3. Test key functionality to ensure everything works

TROUBLESHOOTING: Browser Still Shows Old Frontend
---------------------------------------------------
If your browser is still displaying the old version of the frontend after updating,
this is due to browser caching. The browser has cached the old HTML, CSS, and
JavaScript files and needs to be forced to reload them from the server.

Solution - Hard Refresh (Force Reload):

Method 1 - Keyboard Shortcuts:

Google Chrome / Microsoft Edge:
- Windows: Press Ctrl + Shift + R
- Or: Press Ctrl + F5
- Or: Hold Ctrl and click the Refresh button

Mozilla Firefox:
- Windows: Press Ctrl + Shift + R
- Or: Press Ctrl + F5
- Or: Hold Ctrl and click the Refresh button

Method 2 - Using Developer Tools (Most Reliable):
This method works when keyboard shortcuts don't:

Google Chrome / Microsoft Edge / Firefox:
1. Press F12 to open Developer Tools
2. Right-click on the Refresh button (circular arrow in address bar)
3. Select "Empty Cache and Hard Reload" or "Hard Reload"
4. The page will reload, bypassing all cached files

Note: The right-click menu on the Refresh button only appears when
Developer Tools (F12) is open. This is often more reliable than Ctrl+Shift+R.

If hard refresh doesn't work, clear browser cache:

Google Chrome:
1. Press Ctrl + Shift + Delete
2. Select "Time range": Last hour (or Last 24 hours)
3. Check "Cached images and files"
4. Uncheck other options (to preserve passwords/history)
5. Click "Clear data"
6. Refresh the page (F5)

Microsoft Edge:
1. Press Ctrl + Shift + Delete
2. Select "Time range": Last hour (or Last 24 hours)
3. Check "Cached images and files"
4. Uncheck other options (to preserve passwords/history)
5. Click "Clear now"
6. Refresh the page (F5)

Mozilla Firefox:
1. Press Ctrl + Shift + Delete
2. Select "Time range to clear": Last hour (or Last 24 hours)
3. Check "Cache"
4. Uncheck other options (to preserve passwords/history)
5. Click "Clear Now"
6. Refresh the page (F5)

Alternative - Open in Private/Incognito Window:
This bypasses the cache entirely and is useful for testing:
- Chrome/Edge: Press Ctrl + Shift + N
- Firefox: Press Ctrl + Shift + P
- Then navigate to your frontend URL

If the new version appears in private mode but not in normal mode,
this confirms it's a caching issue. Clear your browser cache as described above.

ROLLBACK IF NEEDED
-------------------
If the new version has issues, rollback to the backup:

1. Stop the service:
   $ServiceName = "ElyseBackend"
   Stop-Service $ServiceName

2. Restore from backup:
   $BackendPath = "$env:LOCALAPPDATA\ElyseApp\Backend"
   $BackupPath = "$env:LOCALAPPDATA\ElyseApp\Backend_Backup_*"
   $LatestBackup = Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
   
   Remove-Item "$BackendPath\elyse_asp-backend.exe" -Force
   Copy-Item "$LatestBackup\elyse_asp-backend.exe" -Destination "$BackendPath\"

3. Start the service:
   Start-Service $ServiceName

CLEANUP OLD BACKUPS
--------------------
After confirming the new version works, you can delete old backups:

$BackupPath = "$env:LOCALAPPDATA\ElyseApp\Backend_Backup_*"
Get-ChildItem "$BackupPath" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 2 | Remove-Item -Recurse -Force

This keeps the 2 most recent backups and deletes older ones.

Requirements:
=============

- Windows 10/11 (any edition)
- NO .NET Runtime required (included in executable)
- SQL Server access (port 1433)
- 6 application role passwords from SQL Server
- Windows account with permission to create services

Important Notes:
================

- This is a self-contained build (no .NET installation needed)
- USE_KCD must be false for Workgroup environments
- The .exe file is ~128 MB because it includes the full .NET runtime
- Service runs under the current user's Windows account
- Logs are written to %LOCALAPPDATA%\ElyseApp\Backend\logs\ (C:\Users\Username\AppData\Local\ElyseApp\Backend\logs\)
- Use localhost binding (SERVER_URLS=http://localhost:5000) for maximum security
- For network access, use firewall rules to restrict access to specific IPs

================================================================================
VERIFYING USER AUTHENTICATION (AFTER FRONTEND DEPLOYMENT)
================================================================================

Once the frontend is deployed and working, verify that the database is
correctly resolving the connected user:

1. Open the application in your web browser

2. Navigate to: Connected User -> Who is this?

3. Check the username displayed at the right-hand end of the message bar

4. Verify that the username matches the Windows login

This confirms that:
- Windows Authentication is working correctly
- The backend is connecting to SQL Server with the correct service account
- The database is correctly resolving the user's Windows identity
- User-level access control is functioning

If the username is incorrect, check:
- Backend .env configuration (USE_KCD must be false for WORKGROUP)
- SQL Server login exists for the service account (COMPUTERNAME\Username)
- SQL Server connection string (Windows Authentication enabled)
- Service is running under the correct user account

For WORKGROUP deployments, the username should match the Windows account that
the backend service is running under (the account configured in Step 7 of
deployment). This is typically the user's own account (e.g., COMPUTERNAME\JohnDoe).

================================================================================



Do not use this package for Windows Server/Domain deployments with KCD.
For multi-user Server deployments with Active Directory and KCD, use the framework-dependent build.
