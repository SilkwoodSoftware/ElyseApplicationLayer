Elyse Backend Deployment Package - SERVER (Framework-Dependent)
================================================================

Version: {{VERSION}}
Build Date: {{BUILD_DATE}}
Configuration: {{CONFIGURATION}}
Target: Windows Server with IIS and Active Directory
Build Type: Framework-Dependent (requires .NET 8.0 Runtime on server)

TARGET ENVIRONMENT: Windows Server with IIS, Active Directory, and KCD

This is a FRAMEWORK-DEPENDENT build that requires .NET 8.0 Runtime on the server.
Use this for multi-user SERVER deployments with Windows Authentication and KCD.

For WORKGROUP deployments, use the single-file self-contained build instead.

PACKAGE CONTENTS:
- elyse_asp-backend.dll  (Main application)
- elyse_asp-backend.exe  (Small launcher ~148 KB)
- web.config             (IIS configuration)
- .env.template          (Configuration template)
- Supporting DLLs        (~28 MB total)
- README.txt             (This file)
- RELEASE_NOTES.txt      (Release notes for this version)
- VERSION-BACKEND.txt    (Version identifier)
- 01_DOMAIN_SETUP.txt    (Active Directory configuration)
- 03_KCD_CONFIGURATION.txt (Kerberos Constrained Delegation setup)


================================================================================
DEPLOYMENT ORDER
================================================================================

A complete Elyse SERVER deployment requires the following steps in this order.
This README covers Step 4. The other steps are covered by the documents
indicated.

    Step  Action                                  Document
    ----  ------                                  --------
     1    Set up Active Directory                 01_DOMAIN_SETUP.txt
          Create service accounts, security       (included in this package)
          group, and DNS records.

     2    Install SQL Server and restore the      02_SQL_SERVER_AND_DATABASE.txt
          Elyse database.                         (in the database package:
                                                  Elyse_DB_*.zip)

     3    Configure Kerberos Constrained          03_KCD_CONFIGURATION.txt
          Delegation (SPNs and delegation).       (included in this package)
          NOTE: SQL Server must be installed
          and running before this step.

     4    Install the backend application.        This file (below).

     5    Install the frontend application.       FRONTEND_README.txt
                                                  (in the frontend package:
                                                  Elyse-Frontend-*-Deploy-*.zip)

     6    Bootstrap users and configure the       04_BOOTSTRAPPING_AND_CONFIGURATION.txt
          system (onboard users, assign roles,    (in the database package:
          configure global settings).             Elyse_DB_*.zip)

IMPORTANT: Steps 1-3 must be completed before installing the backend.
The backend requires Active Directory, SQL Server, and KCD to be configured
before it can function.


QUICK DEPLOYMENT CHECKLIST:
===========================

Prerequisites (completed in Steps 1-3 above):
  [ ] Active Directory domain configured (01_DOMAIN_SETUP.txt)
  [ ] Service account svc_elyse_be created in AD
  [ ] Security group Elyse_Users created in AD with users added
  [ ] SQL Server installed and Elyse database restored (02_SQL_SERVER_AND_DATABASE.txt)
  [ ] KCD configured: SPNs registered and delegation set (03_KCD_CONFIGURATION.txt)
  [ ] Windows Server 2016+ with IIS 10.0+
  [ ] .NET 8.0 Runtime (ASP.NET Core Hosting Bundle) installed

Deployment Steps:
  [ ] 1. Copy all files to deployment location (e.g., C:\inetpub\wwwroot\Elyse\backend)
  [ ] 2. Create .env file from .env.template with actual values
  [ ] 3. Secure .env file permissions (SYSTEM, Administrators, App Pool only)
  [ ] 4. Create IIS Application Pool (No Managed Code)
  [ ] 5. Create IIS Website or Application
  [ ] 6. Configure Windows Authentication in IIS
  [ ] 7. Configure SQL Server login and permissions (see SQL Server Configuration below)
  [ ] 8. Start application pool
  [ ] 9. Test API endpoint: http://localhost/api/eula/read
  [ ] 10. Check logs in deployment directory: logs\stdout*.log

SQL SERVER CONFIGURATION:
=========================

CRITICAL SECURITY ARCHITECTURE:

Elyse uses SQL Server application roles for ALL data access permissions.
Individual users and the application service account have NO direct permissions.

Required Setup:

1. Create Active Directory User Group:
   - Create an AD security group (e.g., 'Elyse_Users')
   - Add all Elyse users to this group
   - CRITICAL: The IIS application pool identity (service account) must NEVER be
     a member of this group

2. Create SQL Server Login for AD Group:
   - Create a Windows Authentication login mapped to the AD group
   - Example: CREATE LOGIN [DOMAIN\Elyse_Users] FROM WINDOWS;

3. Grant Database Access to User Group:
   - Create database user for the login
   - Grant ONLY the CONNECT permission (no other permissions)
   - Example:
     USE [YourDatabase];
     CREATE USER [DOMAIN\Elyse_Users] FOR LOGIN [DOMAIN\Elyse_Users];
     GRANT CONNECT TO [DOMAIN\Elyse_Users];

4. CRITICAL - Service Account Restrictions:
   - The IIS application pool identity must NEVER have an SQL Server login
   - The service account must NEVER be able to connect to the database directly
   - The application MUST ALWAYS connect using KCD impersonation of the user
   - This ensures all database connections are made as the authenticated user,
     never as the application itself
   - Exception -- WORKGROUP READ ONLY: The read-only backend variant is an
     exception. It serves anonymous users without KCD, so its service account
     MUST have a SQL Server login (CONNECT only). See WORKGROUP_README.txt.

5. Verify Application Roles Exist:
   - The database must contain these 6 application roles:
     * CONFIGURATOR - System configuration access
     * READER       - Read-only access to documents
     * REVIEWER     - Review and comment on documents
     * CONTROLLER   - Control document workflows
     * EDITOR       - Edit and modify documents
     * AUTHORISER   - Authorize and approve documents

6. Configure Application Role Passwords:
   - Set passwords for all 6 application roles in the .env file
   - The backend uses sp_setapprole to activate roles based on user permissions

SECURITY SUMMARY:
- Users: CONNECT permission only (via AD group)
- Service Account: NO SQL Server login, NO database access
- All data access: Through application roles activated by sp_setapprole
- All connections: Made as the authenticated user via KCD impersonation

CRITICAL CONFIGURATION:
=======================

.env file settings (edit .env.template and save as .env):

  DB_HOST=YOUR_SQL_SERVER_NAME
  DB_NAME=Elyse_DB
  USE_KCD=true  (MUST be true for SERVER deployments)
  SERVER_URLS=http://localhost:5000  (keep as localhost; the frontend IIS site
                                      on port 8080 proxies /api requests here
                                      via the web.config BackEndProxy rule)

  Application Role Passwords (must match SQL Server):
  CONFIGURATOR_PASSWORD=actual_password
  READER_PASSWORD=actual_password
  REVIEWER_PASSWORD=actual_password
  CONTROLLER_PASSWORD=actual_password
  EDITOR_PASSWORD=actual_password
  AUTHORISER_PASSWORD=actual_password

REQUIREMENTS:
============

Server:
  - Windows Server 2016 or later
  - IIS 10.0 or later
  - .NET 8.0 Runtime (ASP.NET Core Hosting Bundle)
  - Active Directory domain membership (for KCD)

Database:
  - SQL Server with Windows Authentication
  - Active Directory security group for Elyse users
  - Windows login for AD group with CONNECT permission only
  - 6 application roles with configured passwords:
    CONFIGURATOR, READER, REVIEWER, CONTROLLER, EDITOR, AUTHORISER

For KCD:
  - Domain-joined server
  - Service account with delegation rights
  - SQL Server SPN registered in Active Directory

IMPORTANT NOTES:
===============

- This is a framework-dependent build (requires .NET Runtime on server)
- .env file must be in same directory as elyse_asp-backend.dll
- Never commit .env file to source control
- Backup .env file securely (contains passwords)
- Connection pooling is disabled for proper KCD operation
- USE_KCD MUST be true - application MUST NEVER connect as itself
- Each user's Windows identity is used for SQL Server connections via KCD
- All users must be members of the configured AD security group
- Service account must NEVER be in the AD group or have SQL Server login
  (Exception: the WORKGROUP READ ONLY variant requires its own SQL login)
- User permissions are controlled through application roles, not SQL Server permissions



================================================================
UPDATING TO A NEW RELEASE
================================================================

When a new version of Elyse is released, follow these steps to update
your SERVER deployment while preserving your configuration and data.

IMPORTANT: The update process requires stopping the IIS application pool,
which will make the backend unavailable to all users during the update.
Plan the update during a maintenance window.

PREREQUISITES:
==============

Before starting the update:
  [ ] Download and extract the new Elyse-Backend-*-SERVER-Deploy-*.zip package
  [ ] Verify you have Administrator access to the server
  [ ] Verify you have access to IIS Manager
  [ ] Note your current installation location (e.g., C:\inetpub\wwwroot\Elyse\backend)
  [ ] Note your IIS application pool name (e.g., ElyseAppPool)
  [ ] Schedule a maintenance window (estimated time: 10-15 minutes)
  [ ] Notify users of the planned downtime

STEP 1: BACKUP CURRENT VERSION
===============================

1. Open PowerShell as Administrator

2. Navigate to the parent directory of your installation:
   cd C:\inetpub\wwwroot\Elyse

3. Create a backup with timestamp:
   $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
   Copy-Item -Path .\backend -Destination .\backend-backup-$timestamp -Recurse

4. Verify the backup was created:
   dir .\backend-backup-*

   You should see a directory like: backend-backup-20260113-143022

5. CRITICAL - Verify .env file was backed up:
   Test-Path .\backend-backup-$timestamp\.env

   This should return: True
   If it returns False, STOP and investigate before proceeding!

STEP 2: STOP IIS APPLICATION POOL
==================================

1. Open IIS Manager (inetmgr.exe) or use PowerShell:
   Import-Module WebAdministration
   Stop-WebAppPool -Name 'ElyseAppPool'

2. Verify the application pool is stopped:
   Get-WebAppPoolState -Name 'ElyseAppPool'

   Should show: Value = Stopped

3. Wait 10 seconds for all connections to close:
   Start-Sleep -Seconds 10

STEP 3: UPDATE BACKEND FILES
=============================

1. Navigate to your installation directory:
   cd C:\inetpub\wwwroot\Elyse\backend

2. Delete OLD executable and DLL files (but keep .env and logs):
   Remove-Item *.dll -Force
   Remove-Item *.exe -Force
   Remove-Item *.json -Force
   Remove-Item *.xml -Force
   Remove-Item web.config -Force

   IMPORTANT: Do NOT delete:
   - .env file (contains your passwords)
   - logs\ directory (contains application logs)

3. Copy NEW files from the extracted package:
   $packagePath = 'C:\Temp\Elyse-Backend-Deploy-SERVER-20260113-143022'
   Copy-Item $packagePath\*.dll -Destination . -Force
   Copy-Item $packagePath\*.exe -Destination . -Force
   Copy-Item $packagePath\*.json -Destination . -Force
   Copy-Item $packagePath\*.xml -Destination . -Force
   Copy-Item $packagePath\web.config -Destination . -Force

4. Verify the new executable was copied:
   Get-Item .\elyse_asp-backend.exe | Select-Object Name, Length, LastWriteTime

   Check that LastWriteTime matches the new package date

STEP 4: VERIFY CONFIGURATION
=============================

1. Verify .env file still exists and contains your settings:
   Test-Path .\.env
   Get-Content .\.env | Select-String 'DB_HOST|USE_KCD'

   Should show your SQL Server name and USE_KCD=true

2. If .env is missing or incorrect, restore from backup:
   Copy-Item ..\backend-backup-$timestamp\.env -Destination .\.env -Force

STEP 5: START IIS APPLICATION POOL
===================================

1. Start the application pool:
   Start-WebAppPool -Name 'ElyseAppPool'

2. Verify the application pool is running:
   Get-WebAppPoolState -Name 'ElyseAppPool'

   Should show: Value = Started

STEP 6: VERIFY UPDATE
=====================

1. Wait 5 seconds for the application to start:
   Start-Sleep -Seconds 5

2. Test the API endpoint (replace with your actual URL):
   Invoke-WebRequest -Uri 'http://localhost/api/eula/read' -UseDefaultCredentials

   Should return: StatusCode = 200

3. Check the application logs for any errors:
   Get-Content .\logs\stdout*.log -Tail 50

   Look for any ERROR or CRITICAL messages

4. Test with a browser:
   - Open browser and navigate to: http://your-server/api/eula/read
   - Should see JSON response with EULA text

5. Test with the frontend application:
   - Have a user log in to the Elyse frontend
   - Verify they can access documents and perform normal operations

STEP 7: CLEANUP OLD BACKUPS (OPTIONAL)
=======================================

After confirming the update is successful, you can remove old backups
to free up disk space. Keep at least the most recent backup.

1. List all backups:
   cd C:\inetpub\wwwroot\Elyse
   dir .\backend-backup-* | Sort-Object Name

2. Remove old backups (keep the most recent 2-3):
   Remove-Item .\backend-backup-20260101-120000 -Recurse -Force

   Replace the timestamp with the actual old backup directory name

ROLLBACK PROCEDURE (IF UPDATE FAILS)
=====================================

If the update fails or causes problems, you can quickly rollback
to the previous version using your backup.

1. Stop the IIS application pool:
   Stop-WebAppPool -Name 'ElyseAppPool'
   Start-Sleep -Seconds 10

2. Navigate to parent directory:
   cd C:\inetpub\wwwroot\Elyse

3. Remove the failed update:
   Remove-Item .\backend -Recurse -Force

4. Restore from backup:
   Copy-Item .\backend-backup-$timestamp -Destination .\backend -Recurse

5. Start the application pool:
   Start-WebAppPool -Name 'ElyseAppPool'

6. Verify the rollback:
   Start-Sleep -Seconds 5
   Invoke-WebRequest -Uri 'http://localhost/api/eula/read' -UseDefaultCredentials

7. Check logs:
   Get-Content .\backend\logs\stdout*.log -Tail 50

TROUBLESHOOTING
===============

Problem: Application pool won't start after update
Solution:
  - Check Event Viewer > Windows Logs > Application for errors
  - Verify .env file exists and has correct format
  - Verify .NET 8.0 Runtime is installed
  - Check file permissions on backend directory
  - Review logs\stdout*.log for startup errors

Problem: 500 Internal Server Error when accessing API
Solution:
  - Check logs\stdout*.log for detailed error messages
  - Verify SQL Server is accessible from the server
  - Verify KCD delegation is still configured correctly
  - Test SQL Server connection with Windows Authentication
  - Verify application role passwords in .env are correct

Problem: Users get authentication errors
Solution:
  - Verify Windows Authentication is enabled in IIS
  - Verify USE_KCD=true in .env file
  - Check that users are members of the AD security group
  - Verify KCD delegation in Active Directory
  - Check SQL Server login for AD group still exists

Problem: Database connection errors
Solution:
  - Verify DB_HOST in .env matches SQL Server name
  - Verify DB_NAME in .env matches database name
  - Test SQL Server connectivity from server
  - Verify SQL Server is accepting Windows Authentication
  - Check SQL Server error logs for connection attempts

For additional support, check the application logs and SQL Server logs
for detailed error messages.

================================================================
VERIFYING USER AUTHENTICATION (AFTER FRONTEND DEPLOYMENT)
================================================================

Once the frontend is deployed and working, verify that the database is
correctly resolving the connected user:

1. Open the application in your web browser

2. Navigate to: Connected User -> Who is this?

3. Check the username displayed at the right-hand end of the message bar

4. Verify that the username matches the Windows login

This confirms that:
- Windows Authentication is working correctly
- The backend is properly impersonating the user (KCD is functioning)
- The database is correctly resolving the user's Windows identity
- User-level access control is functioning

If the username is incorrect or shows the service account instead of the
actual username, check:
- Backend .env configuration (USE_KCD must be true)
- IIS Windows Authentication settings
- KCD delegation configuration in Active Directory
- SQL Server connection string (Windows Authentication enabled)
- Service account delegation permissions

For SERVER deployments, seeing the service account name instead of the user's
name indicates that KCD is not working correctly. All users will appear as the
same account, breaking user-level access control.
