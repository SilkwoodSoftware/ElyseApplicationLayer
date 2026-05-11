Elyse Frontend Deployment Package
==================================

Version: {{VERSION}}
Build Date: {{BUILD_DATE}}
Configuration: Production (Optimized)
Package Type: Static files (HTML, JavaScript, CSS)

TARGET ENVIRONMENT: Any web server (IIS, nginx, Apache, etc.)

This frontend package works with BOTH SERVER and WORKGROUP backend deployments.
Configure the backend URL in assets/config.json after deployment.

================================================================================
IMPORTANT: FRONTEND INSTALLATION FOR MULTIPLE USERS ON SAME MACHINE
================================================================================
PREREQUISITES CHECKLIST

[ ] IIS Installed (with Static Content & URL Rewrite)

[ ] ARR 3.0 Installed

[ ] Administrative Access to PowerShell

[ ] Backend URL / Port identified
================================================================================

SCENARIO A: Single Machine with Multiple User Accounts (WORKGROUP)
-------------------------------------------------------------------

When deploying to a single machine with multiple Windows user accounts:

FRONTEND: Install ONCE (Shared)
- The frontend is installed in a shared location (e.g., C:\inetpub\wwwroot\Elyse\frontend)
- All users access the SAME frontend files
- The frontend is just static HTML/CSS/JavaScript - no user-specific data
- Only one frontend installation is needed per machine

BACKEND: Install separately for each user (Isolated)
- Each user must have their own backend instance
- User Alice: C:\Users\Alice\AppData\Local\ElyseApp\Backend\
- User Bob: C:\Users\Bob\AppData\Local\ElyseApp\Backend\
- User Carol: C:\Users\Carol\AppData\Local\ElyseApp\Backend\
- Each backend runs as a Windows Service under that user's account
- Each backend connects to SQL Server with that user's Windows credentials

HOW IT WORKS:
1. All users share the same frontend (C:\inetpub\wwwroot\Elyse\frontend)
2. Frontend calls http://localhost:5000/api (configured in config.json)
3. When Alice logs in:
   - Alice's backend service starts (runs as COMPUTERNAME\Alice)
   - Frontend connects to Alice's backend on port 5000
   - Backend connects to SQL Server as COMPUTERNAME\Alice
   - SQL Server returns only Alice's data
4. When Bob logs in (Alice logs out):
   - Alice's backend service stops
   - Bob's backend service starts (runs as COMPUTERNAME\Bob)
   - Frontend connects to Bob's backend on port 5000
   - Backend connects to SQL Server as COMPUTERNAME\Bob
   - SQL Server returns only Bob's data

SECURITY:
- The frontend has no user-specific data - it's just a UI shell
- All security is enforced by the backend and SQL Server
- Each user's backend is isolated in their AppData folder
- SQL Server uses Windows Authentication to identify each user
- Database ACLs control what data each user can access

SUMMARY:
- Frontend: Install ONCE per machine (shared by all users)
- Backend: Install ONCE per user (isolated in each user's AppData)
- Each user gets their own data based on their Windows account

================================================================================

PACKAGE CONTENTS:
- index.html              (Main application entry point)
- assets/config.json      (Runtime configuration - EDIT THIS)
- assets/config.template.json (Configuration template)
- assets/*.csv            (Application configuration files)
- *.js, *.css             (Optimized application bundles)
- web.config              (IIS URL rewriting configuration)
- 01_DOMAIN_SETUP.txt     (Active Directory configuration - SERVER deployments only)
- 03_KCD_CONFIGURATION.txt (KCD setup - SERVER deployments only)

================================================================================
DEPLOYMENT ORDER
================================================================================

A complete Elyse deployment requires the following steps in this order.
This README covers Step 5 (SERVER) or Step 3 (WORKGROUP). The other steps
are covered by the documents indicated.

FOR SERVER DEPLOYMENTS (with Active Directory and KCD):

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

     4    Install the backend application.        SERVER_README.txt
                                                  (in the backend package:
                                                  Elyse-Backend-*-SERVER-*.zip)

     5    Install the frontend application.       This file (below).

     6    Bootstrap users and configure the       04_BOOTSTRAPPING_AND_CONFIGURATION.txt
          system.                                 (in the database package:
                                                  Elyse_DB_*.zip)

FOR WORKGROUP DEPLOYMENTS (single user, no domain):

    Step  Action                                  Document
    ----  ------                                  --------
     1    Install SQL Server and restore the      02_SQL_SERVER_AND_DATABASE.txt
          Elyse database.                         (in the database package)

     2    Install the backend application.        WORKGROUP_README.txt
                                                  (in the backend package:
                                                  Elyse-Backend-*-WORKGROUP-*.zip)

     3    Install the frontend application.       This file (below).

     4    Bootstrap users and configure the       04_BOOTSTRAPPING_AND_CONFIGURATION.txt
          system.                                 (in the database package)

NOTE: 01_DOMAIN_SETUP.txt and 03_KCD_CONFIGURATION.txt are included in this
package for reference but are NOT required for workgroup deployments.

================================================================================
DEPLOYMENT OVERVIEW
================================================================================

Choose ONE of two web server options:

OPTION A: IIS (Internet Information Services)
  - Recommended for production environments
  - Built into Windows Server and Windows 10/11 Pro
  - Runs as Windows Service (auto-starts on boot)
  - More robust and feature-rich

OPTION B: Node.js http-server
  - Simpler alternative if IIS not available
  - Requires Node.js installation
  - Can be configured as Windows Service (auto-starts on boot)
  - Suitable for workgroup deployments

================================================================================
OPTION A: DEPLOYMENT WITH IIS
================================================================================

STEP 1: INSTALL IIS
-------------------
IIS must be installed before deploying the frontend.

On Windows Server:
1. Open Server Manager
2. Click "Add roles and features"
3. Click "Next" until "Server Roles"
4. Check "Web Server (IIS)"
5. Click "Add Features" when prompted
6. Click "Next" until "Role Services"
7. Ensure these are checked:
   - Web Server > Common HTTP Features > Static Content
   - Web Server > Common HTTP Features > Default Document
   - Management Tools > IIS Management Console
8. Click "Next" then "Install"
9. Wait for installation to complete
10. Click "Close"

On Windows 10/11 Pro:
1. Open Control Panel
2. Click "Programs and Features"
3. Click "Turn Windows features on or off"
4. Check "Internet Information Services"
5. Expand "Internet Information Services"
6. Expand "World Wide Web Services"
7. Expand "Application Development Features"
8. Check "WebSocket Protocol" (optional but recommended)
9. Expand "Common HTTP Features"
10. Ensure these are checked:
    - Default Document
    - Static Content
11. Expand "Web Management Tools"
12. Check "IIS Management Console"
13. Click "OK"
14. Wait for installation to complete
15. Click "Close"

Verify IIS Installation:
1. Open web browser
2. Navigate to http://localhost
3. You should see the IIS default page

STEP 2: INSTALL URL REWRITE MODULE (REQUIRED FOR ANGULAR ROUTING)
------------------------------------------------------------------
The URL Rewrite module is required for Angular routing to work correctly.

1. Download URL Rewrite Module:
   https://www.iis.net/downloads/microsoft/url-rewrite

2. Run the installer (rewrite_amd64_en-US.msi)
3. Accept license agreement
4. Click "Install"
5. Wait for installation to complete
6. Click "Finish"

Note: If you skip this step, direct URL navigation in the application will fail.

STEP 3: COPY FILES TO WEB SERVER
Using Windows Explorer or Remote Desktop:

1. Create deployment directory:
   Recommended: C:\inetpub\wwwroot\Elyse\frontend

2. Extract the ZIP file

3. Copy ALL files from the extracted folder to C:\inetpub\wwwroot\Elyse\frontend\

Verify: Directory should contain index.html, assets folder, and various .js/.css files

STEP 4: CONFIGURE BACKEND API URL
----------------------------------
Using Notepad or any text editor:

1. Navigate to C:\inetpub\wwwroot\Elyse\frontend\assets\
2. Open config.json
3. Edit the apiUrl to point to your frontend server (the IIS web.config proxies
   /api requests to the backend):

   FOR SERVER DEPLOYMENT:
   {
     "apiUrl": "http://FRONTEND-HOSTNAME:8080/api"
   }
   
   Replace FRONTEND-HOSTNAME with the hostname of the machine running the
   frontend IIS site. The web.config contains a rewrite rule that proxies
   /api requests to the backend on port 5000.
   
   Examples:
   - "apiUrl": "http://elyse-fe01:8080/api"
   - "apiUrl": "http://elyse-fe01.domain.com:8080/api"
   
   FOR WORKGROUP DEPLOYMENT (backend on same machine):
   {
     "apiUrl": "http://localhost:8080/api"
   }
   Or http://localhost:5000/api if not using IIS (Option B).

4. Save the file

IMPORTANT: You can change this URL anytime without rebuilding the frontend.

STEP 5: CONFIGURE IIS
---------------------
Open IIS Manager:
1. Press Windows key
2. Type "IIS Manager"
3. Press Enter

Create a new website:
1. In IIS Manager, expand the server node in left panel
2. Right-click "Sites" -> "Add Website"
3. Enter the following:
   - Site name: Elyse
   - Application pool: DefaultAppPool
   - Physical path: C:\inetpub\wwwroot\Elyse\frontend
   - Binding Type: http
   - IP address: All Unassigned
   - Port: 8080
   - Host name: (leave blank)
4. Click OK
5. IIS must be able to load the .md help files:
   - Select the site.   
   - Double-click MIME Types.  
   - Click Add... in the right sidebar
   - Enter .md in the filename extension and enter text/markdown in the MIME type field. 
   - Click Apply. 
6. Install IIS Modules: URL Rewrite and ARR 3.0. if not already. 
7. Open PowerShell as Administrator and run the following script to enable ARR proxy mode
   Note that ARR must be installed and IIS Manager must be restarted before running the following.
	# 1. Ensure the WebAdministration module is loaded
	Import-Module WebAdministration
	# 2. Enable the Proxy setting in ARR (Crucial for the 'Rewrite' action to work)
	Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -value "True"
	# 3. Optional: Set a timeout if your database queries take longer than 30 seconds
	Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "timeout" -value "00:02:00"
	Write-Host "IIS Proxy Mode has been enabled successfully." -ForegroundColor Green
8. In IIS click on the Server Note > Application Request Routing Cache > Server Proxy Settings > and check the box 
   "Enable proxy".  (Othewise a 502.3 Bad Gateway error will occur.)
9. The new site should start automatically
   If not, select "Elyse" site and click "Start" in the Actions panel
10. Verify web.config is present:
   - Navigate to C:\inetpub\wwwroot\Elyse\frontend\
   - Confirm web.config file exists
   - This file enables Angular routing and API proxying

   SEPARATE-SERVER DEPLOYMENTS: The web.config contains a BackEndProxy
   rewrite rule that forwards /api requests to http://127.0.0.1:5000
   (the backend on the same machine). If the backend is on a DIFFERENT
   server, open web.config in Notepad and change http://127.0.0.1:5000
   to the backend server's address (e.g., http://ELYSE-BE01:5000).

STEP 6: CONFIGURE WINDOWS FIREWALL (IF ACCESSING FROM OTHER MACHINES)
----------------------------------------------------------------------
If users will access the frontend from other computers:

1. Open Windows Defender Firewall with Advanced Security:
   - Press Windows key
   - Type "Windows Firewall with Advanced Security"
   - Press Enter

2. Click "Inbound Rules" in left panel

3. Click "New Rule" in right panel

4. Select "Port" and click "Next"

5. Select "TCP" and enter port number (e.g., 80 or 8080)

6. Click "Next"

7. Select "Allow the connection"

8. Click "Next"

9. Check all profiles (Domain, Private, Public)

10. Click "Next"

11. Name: "Elyse Frontend HTTP"

12. Click "Finish"

STEP 7: KCD REMINDER (SERVER DEPLOYMENTS ONLY)
For SERVER deployments, KCD (Kerberos Constrained Delegation) must already be
configured before the backend was deployed (Step 3 in the DEPLOYMENT ORDER
above). If KCD has not been configured, see 03_KCD_CONFIGURATION.txt
(included in this package).


STEP 8: TEST DEPLOYMENT
-----------------------
1. Open a web browser

2. Navigate to: http://localhost:8080

3. The application should load and display the main interface

If you see errors, check:
- Backend is running (for WORKGROUP: check Windows Services for "ElyseBackend")
- Backend URL in assets/config.json is correct
- Test backend directly: http://localhost:5000/api/eula/read

STEP 9: CREATE DESKTOP SHORTCUT (OPTIONAL)
-------------------------------------------
To create a shortcut with custom icon for easy access:

METHOD 1 - Using Windows Shortcut Wizard:
1. Right-click on the Desktop
2. Select "New" -> "Shortcut"
3. Enter the location: http://localhost:8080
4. Click "Next"
5. Enter a name: Elyse Application
6. Click "Finish"
7. Right-click the new shortcut and select "Properties"
8. Click "Change Icon" button
9. Click "Browse" and navigate to: C:\inetpub\wwwroot\Elyse\frontend\elyse.ico
10. Click OK, then OK again

METHOD 2 - Create Internet Shortcut File with Icon:
1. Open Notepad
2. Type the following:
   [InternetShortcut]
   URL=http://localhost:8080
   IconFile=C:\inetpub\wwwroot\Elyse\frontend\elyse.ico
   IconIndex=0
3. Save as: Elyse.url (on Desktop or any location)
4. The shortcut will display with the Elyse icon
5. Double-click to open the application

Note: The elyse.ico file is included in the deployment package and will be
available at C:\inetpub\wwwroot\Elyse\frontend\elyse.ico after deployment.

STEP 10: CONFIGURE HTTPS (OPTIONAL BUT RECOMMENDED)
--------------------------------------------------
For production deployments, configure HTTPS:

In IIS Manager:
1. Obtain SSL certificate (from CA or self-signed for testing)
2. Right-click your site -> "Edit Bindings"
3. Click "Add"
4. Type: https, Port: 443
5. Select your SSL certificate
6. Click OK

Update config.json to use https:
{
  "apiUrl": "https://FRONTEND-HOSTNAME/api"
}
If using the default HTTPS port (443), no port number is needed in the URL.

================================================================================
OPTION B: DEPLOYMENT WITH NODE.JS HTTP-SERVER
================================================================================

This option is simpler than IIS but requires Node.js installation.
The http-server will be configured as a Windows Service to auto-start on boot.

STEP 1: INSTALL NODE.JS
-----------------------
Node.js must be installed to run http-server.

1. Download Node.js LTS (Long Term Support) version:
   https://nodejs.org/

2. Run the installer (node-vXX.XX.X-x64.msi)

3. Installation wizard:
   - Click "Next"
   - Accept license agreement
   - Click "Next"
   - Installation path: C:\Program Files\nodejs\ (default)
   - Click "Next"
   - Ensure "Add to PATH" is checked
   - Click "Next"
   - Click "Install"
   - Click "Finish"

4. Verify installation:
   - Open Command Prompt (cmd.exe)
   - Type: node --version
   - Should display version number (e.g., v20.11.0)
   - Type: npm --version
   - Should display version number (e.g., 10.2.4)

STEP 2: INSTALL HTTP-SERVER
----------------------------
1. Open Command Prompt as Administrator:
   - Press Windows key
   - Type "cmd"
   - Right-click "Command Prompt"
   - Select "Run as administrator"

2. Install http-server globally:
   npm install -g http-server

3. Wait for installation to complete

4. Verify installation:
   http-server --version

STEP 3: COPY FILES TO DEPLOYMENT DIRECTORY
-------------------------------------------
1. Create deployment directory:
   mkdir C:\Elyse\frontend

2. Extract the ZIP file

3. Copy ALL files from the extracted folder to C:\Elyse\frontend\

Verify: Directory should contain index.html, assets folder, and various .js/.css files

STEP 4: CONFIGURE BACKEND API URL
----------------------------------
Using Notepad:

1. Navigate to C:\Elyse\frontend\assets\
2. Open config.json
3. Edit the apiUrl:

   FOR WORKGROUP DEPLOYMENT (backend on same machine):
   {
     "apiUrl": "http://localhost:5000/api"
   }
   
   FOR SERVER DEPLOYMENT (backend on separate server):
   {
     "apiUrl": "http://BACKEND-HOSTNAME:5000/api"
   }
   
   Replace BACKEND-HOSTNAME with the actual backend server hostname or IP.
   Port 5000 is the default backend port. Node.js does not proxy API
   requests, so the apiUrl must point directly to the backend.

4. Save the file

STEP 5: INSTALL NSSM (NON-SUCKING SERVICE MANAGER)
---------------------------------------------------
NSSM allows http-server to run as a Windows Service (auto-start on boot).

1. Download NSSM:
   https://nssm.cc/download

2. Extract the ZIP file (e.g., nssm-2.24.zip)

3. Copy the appropriate executable to a permanent location:
   - For 64-bit Windows: Copy nssm-2.24\win64\nssm.exe to C:\Windows\System32\
   - For 32-bit Windows: Copy nssm-2.24\win32\nssm.exe to C:\Windows\System32\

4. Verify installation:
   - Open Command Prompt
   - Type: nssm
   - Should display NSSM help text

STEP 6: CREATE WINDOWS SERVICE FOR HTTP-SERVER
-----------------------------------------------
1. Open Command Prompt as Administrator

2. Create the service:
   nssm install ElyseFrontend

3. NSSM Service Installer window will open:

   Application tab:
   - Path: C:\Program Files\nodejs\node.exe
   - Startup directory: C:\Elyse\frontend
   - Arguments: C:\Program Files\nodejs\node_modules\http-server\bin\http-server -p 8080 -c-1

   Details tab:
   - Display name: Elyse Frontend
   - Description: Elyse Frontend Web Server
   - Startup type: Automatic

   I/O tab:
   - Output (stdout): C:\Elyse\frontend\http-server.log
   - Error (stderr): C:\Elyse\frontend\http-server-error.log

4. Click "Install service"

5. Start the service:
   nssm start ElyseFrontend

6. Verify service is running:
   nssm status ElyseFrontend
   
   Should display: SERVICE_RUNNING

STEP 7: CONFIGURE WINDOWS FIREWALL
-----------------------------------
If users will access the frontend from other computers:

1. Open Windows Defender Firewall with Advanced Security

2. Click "Inbound Rules" -> "New Rule"

3. Select "Port" -> "Next"

4. Select "TCP" and enter port: 8080

5. Click "Next"

6. Select "Allow the connection" -> "Next"

7. Check all profiles -> "Next"

8. Name: "Elyse Frontend HTTP" -> "Finish"

STEP 8: TEST DEPLOYMENT
-----------------------
1. Open web browser

2. Navigate to:
   - Local: http://localhost:8080
   - Remote: http://your-server-name:8080 or http://your-server-ip:8080

3. Application should load and display the login page or main interface

4. Check logs if issues occur:
   - C:\Elyse\frontend\http-server.log
   - C:\Elyse\frontend\http-server-error.log

STEP 9: CREATE DESKTOP SHORTCUT (OPTIONAL)
-------------------------------------------
To create a shortcut with custom icon:

METHOD 1 - Using Windows Shortcut Wizard:
1. Right-click on the Desktop
2. Select "New" -> "Shortcut"
3. Enter the location: http://localhost:8080
4. Click "Next"
5. Enter a name: Elyse Application
6. Click "Finish"
7. Right-click the new shortcut and select "Properties"
8. Click "Change Icon" button
9. Click "Browse" and navigate to: C:\Elyse\frontend\elyse.ico
10. Click OK, then OK again

METHOD 2 - Create Internet Shortcut File with Icon:
1. Open Notepad
2. Type the following:
   [InternetShortcut]
   URL=http://localhost:8080
   IconFile=C:\Elyse\frontend\elyse.ico
   IconIndex=0
3. Save as: Elyse.url (on Desktop or any location)
4. Double-click to open the application

STEP 10: VERIFY AUTO-START ON BOOT
-----------------------------------
1. Restart the computer

2. After restart, open web browser

3. Navigate to http://localhost:8080

4. Application should load automatically (service started on boot)

MANAGING THE HTTP-SERVER SERVICE:
----------------------------------
Stop service:    nssm stop ElyseFrontend
Start service:   nssm start ElyseFrontend
Restart service: nssm restart ElyseFrontend
Remove service:  nssm remove ElyseFrontend confirm

View service status:
1. Press Windows key
2. Type "services.msc"
3. Press Enter
4. Find "Elyse Frontend" in the list
5. Status should show "Running"
6. Startup Type should show "Automatic"

================================================================================
COMMON TO BOTH OPTIONS: TROUBLESHOOTING
================================================================================

Application won't load:
- Verify all files were copied correctly
- Check IIS site/application is started
- Check Windows Event Viewer for IIS errors
- Verify physical path in IIS matches deployment directory

Blank page or "Cannot GET /" error:
- Verify index.html exists in deployment directory
- Check IIS has Static Content feature installed
- Verify web.config is present for URL rewriting

"Failed to load config.json":
- Verify assets/config.json exists
- Check file permissions (IIS user needs read access)
- Check browser console for exact error

Cannot connect to backend:
- Verify backend is running
- Test backend URL directly in browser
- Check apiUrl in config.json is correct
- Verify firewall allows connection to backend port
- Check CORS configuration on backend

================================================================================
RUNTIME CONFIGURATION
================================================================================

KEY FEATURE: The backend API URL is loaded from assets/config.json at runtime.

This means:
- You can change the backend URL without rebuilding the frontend
- Same frontend package works for development, testing, and production
- Just edit assets/config.json and refresh the browser

To change backend URL:
1. Edit C:\inetpub\wwwroot\Elyse\frontend\assets\config.json
2. Change "apiUrl" to new backend URL
3. Save file
4. Refresh browser (Ctrl+F5 to clear cache)

No IIS restart or application rebuild required.

================================================================================
UPDATING TO A NEW RELEASE
================================================================================

When a new version of the frontend is released, follow the steps below to
update your deployment. Two methods are provided for each option: a manual
method using File Explorer, and a PowerShell script method.

IMPORTANT: WHY YOU MUST DELETE OLD FILES FIRST
Each Angular build produces JavaScript and CSS files with unique hashed
filenames (e.g. main.abc123.js). A new build will have different filenames.
If you copy new files over the top without deleting the old ones first,
orphan files from the previous version will remain, wasting disk space and
potentially causing confusion. Always delete all files in the frontend
folder before copying the new release.

OPTION A: UPDATING IIS DEPLOYMENT
----------------------------------

METHOD 1 - MANUAL UPDATE (FILE EXPLORER)
-----------------------------------------

1. BACKUP CURRENT VERSION
   In File Explorer, navigate to C:\inetpub\wwwroot\Elyse\.
   Right-click the "frontend" folder and select Copy, then right-click
   in the same directory and select Paste. Windows will create
   "frontend - Copy". Rename it to frontend_backup_YYYYMMDD
   (replacing YYYYMMDD with today's date, e.g. frontend_backup_20260415).

2. SAVE YOUR CONFIG.JSON
   Navigate into frontend\assets\. Right-click config.json and select
   Copy. Paste it into the backup folder you just created (or another
   safe location such as the Desktop). This file contains your backend
   URL and must be preserved.

3. EXTRACT THE NEW PACKAGE
   Locate the new Elyse-Frontend-*-Deploy-*.zip file. Right-click it
   and select "Extract All...", choose a temporary location
   (e.g. C:\Temp\ElyseFrontend), and click Extract.

4. DELETE ALL OLD FILES
   Navigate to C:\inetpub\wwwroot\Elyse\frontend\.
   Press Ctrl+A to select everything, then press Delete.
   Confirm the deletion. The "frontend" folder itself should remain
   (empty).

5. COPY NEW FILES
   Navigate to the extracted folder (e.g. C:\Temp\ElyseFrontend).
   Press Ctrl+A to select all files, then Ctrl+C to copy.
   Navigate back to C:\inetpub\wwwroot\Elyse\frontend\ and press
   Ctrl+V to paste.

6. RESTORE CONFIG.JSON
   Copy the saved config.json from your backup location back into
   frontend\assets\, overwriting the new template version. This
   preserves your backend URL configuration.

7. VERIFY .MD MIME TYPE (IIS ONLY)
   Open IIS Manager, select the Elyse site, and double-click
   MIME Types. Confirm that .md -> text/markdown is listed.
   If it is missing, click Add... in the Actions panel and re-add it
   (extension: .md, MIME type: text/markdown). See Step 5 of the
   initial setup for details. This setting is stored in IIS (not in
   web.config) and can be lost if the site was deleted and recreated.

8. TEST
   Open a web browser and navigate to http://localhost:8080.
   Press Ctrl+Shift+R to hard refresh (clear cache).
   The application should load with the new version.

No IIS restart required - changes take effect immediately.

METHOD 2 - POWERSHELL SCRIPT
------------------------------
Open PowerShell as Administrator. Edit the $NewPackagePath variable on
the second line to match where you extracted the new ZIP, then run:

# === EDIT THIS: Set to the folder where you extracted the new ZIP ===
$NewPackagePath = "C:\Temp\ElyseFrontend"

$FrontendPath = "C:\inetpub\wwwroot\Elyse\frontend"
$BackupPath = "C:\inetpub\wwwroot\Elyse\frontend_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Step 1: Backup current version
Copy-Item -Path "$FrontendPath" -Destination "$BackupPath" -Recurse -Force
Write-Host "Backup created at: $BackupPath"

# Step 2: Preserve config.json
Copy-Item "$FrontendPath\assets\config.json" "$env:TEMP\config.json.backup"

# Step 3: Delete old files (avoids orphan hashed bundles from previous build)
Remove-Item "$FrontendPath\*" -Recurse -Force

# Step 4: Copy new files
Copy-Item -Path "$NewPackagePath\*" -Destination "$FrontendPath\" -Recurse -Force

# Step 5: Restore config.json
Copy-Item "$env:TEMP\config.json.backup" "$FrontendPath\assets\config.json" -Force

# Step 6: Done
Write-Host "Update complete. Open browser and press Ctrl+Shift+R to hard refresh."

No IIS restart required - changes take effect immediately.

NOTE: After updating, open IIS Manager and confirm the .md -> text/markdown
MIME type is still present on the Elyse site. If help files are not
displaying, re-add it as described in Step 5 of the initial setup.

ROLLBACK IF NEEDED (IIS)
--------------------------
If the new version has issues, restore from the backup:

Using File Explorer:
1. Navigate to C:\inetpub\wwwroot\Elyse\frontend\. Select all (Ctrl+A)
   and delete.
2. Navigate to your backup folder (e.g. frontend_backup_20260415).
   Select all (Ctrl+A), copy (Ctrl+C), navigate back to the empty
   frontend folder, and paste (Ctrl+V).
3. Verify the .md MIME type is present in IIS Manager.
4. Hard refresh your browser (Ctrl+Shift+R).

Or via PowerShell:
$FrontendPath = "C:\inetpub\wwwroot\Elyse\frontend"
$BackupPath = "C:\inetpub\wwwroot\Elyse\frontend_backup_YYYYMMDD_HHMMSS"
Remove-Item "$FrontendPath\*" -Recurse -Force
Copy-Item -Path "$BackupPath\*" -Destination "$FrontendPath\" -Recurse -Force

Then hard refresh your browser (Ctrl+Shift+R).

CLEANUP OLD BACKUPS (IIS)
---------------------------
After confirming the new version works, keep the 2 most recent backups:

Get-ChildItem "C:\inetpub\wwwroot\Elyse\frontend_backup_*" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 2 |
    Remove-Item -Recurse -Force

OPTION B: UPDATING NODE.JS HTTP-SERVER DEPLOYMENT
--------------------------------------------------

METHOD 1 - MANUAL UPDATE (FILE EXPLORER)
-----------------------------------------

1. STOP THE SERVICE
   Open the Services application (press the Windows key, type
   services.msc, press Enter). Find "Elyse Frontend" in the list,
   right-click it, and select Stop.

2. BACKUP CURRENT VERSION
   In File Explorer, navigate to C:\Elyse\. Right-click the "frontend"
   folder and select Copy, then Paste. Rename the copy to
   frontend_backup_YYYYMMDD (with today's date).

3. SAVE YOUR CONFIG.JSON
   Navigate into frontend\assets\. Right-click config.json and select
   Copy. Paste it into the backup folder or another safe location.

4. EXTRACT THE NEW PACKAGE
   Locate the new Elyse-Frontend-*-Deploy-*.zip file. Right-click it
   and select "Extract All...", choose a temporary location
   (e.g. C:\Temp\ElyseFrontend), and click Extract.

5. DELETE ALL OLD FILES
   Navigate to C:\Elyse\frontend\. Press Ctrl+A to select everything,
   then press Delete. Confirm the deletion. The "frontend" folder
   itself should remain (empty).

6. COPY NEW FILES
   Navigate to the extracted folder. Press Ctrl+A to select all files,
   then Ctrl+C to copy. Navigate back to C:\Elyse\frontend\ and press
   Ctrl+V to paste.

7. RESTORE CONFIG.JSON
   Copy the saved config.json back into frontend\assets\, overwriting
   the new template version.

8. START THE SERVICE
   In the Services application, find "Elyse Frontend", right-click it,
   and select Start. Wait a few seconds for it to start.

9. TEST
   Open a web browser and navigate to http://localhost:8080.
   Press Ctrl+Shift+R to hard refresh. The application should load
   with the new version.

METHOD 2 - POWERSHELL SCRIPT
------------------------------
Open PowerShell as Administrator. Edit the $NewPackagePath variable on
the second line, then run:

# === EDIT THIS: Set to the folder where you extracted the new ZIP ===
$NewPackagePath = "C:\Temp\ElyseFrontend"

$FrontendPath = "C:\Elyse\frontend"
$BackupPath = "C:\Elyse\frontend_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Step 1: Backup current version
Copy-Item -Path "$FrontendPath" -Destination "$BackupPath" -Recurse -Force
Write-Host "Backup created at: $BackupPath"

# Step 2: Stop service
nssm stop ElyseFrontend

# Step 3: Preserve config.json
Copy-Item "$FrontendPath\assets\config.json" "$env:TEMP\config.json.backup"

# Step 4: Delete old files (avoids orphan hashed bundles from previous build)
Remove-Item "$FrontendPath\*" -Recurse -Force

# Step 5: Copy new files
Copy-Item -Path "$NewPackagePath\*" -Destination "$FrontendPath\" -Recurse -Force

# Step 6: Restore config.json
Copy-Item "$env:TEMP\config.json.backup" "$FrontendPath\assets\config.json" -Force

# Step 7: Start service
nssm start ElyseFrontend
Start-Sleep -Seconds 3
nssm status ElyseFrontend
# Expected: SERVICE_RUNNING

ROLLBACK IF NEEDED (NODE.JS)
------------------------------
If the new version has issues, restore from the backup:

Using File Explorer:
1. Stop the service: in Services (services.msc), right-click
   "Elyse Frontend" and select Stop.
2. Delete all files in C:\Elyse\frontend\.
3. Copy all files from your backup folder back into C:\Elyse\frontend\.
4. Start the service: right-click "Elyse Frontend" and select Start.
5. Hard refresh your browser (Ctrl+Shift+R).

Or via PowerShell:
nssm stop ElyseFrontend
$FrontendPath = "C:\Elyse\frontend"
$BackupPath = "C:\Elyse\frontend_backup_YYYYMMDD_HHMMSS"
Remove-Item "$FrontendPath\*" -Recurse -Force
Copy-Item -Path "$BackupPath\*" -Destination "$FrontendPath\" -Recurse -Force
nssm start ElyseFrontend

Then hard refresh your browser (Ctrl+Shift+R).

CLEANUP OLD BACKUPS (NODE.JS)
-------------------------------
Get-ChildItem "C:\Elyse\frontend_backup_*" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 2 |
    Remove-Item -Recurse -Force

IMPORTANT NOTES FOR UPDATES
----------------------------
- Always backup before updating
- Always delete all old files before copying new ones (hashed filenames differ)
- Always preserve your config.json (contains backend URL)
- For IIS: verify the .md MIME type after updating (can be lost if site recreated)
- Hard refresh browser (Ctrl+Shift+R) after update to clear cache
- Test thoroughly before deleting backups
- Keep at least 2 recent backups for safety

================================================================================
DEPLOYMENT OPTIONS
================================================================================

This frontend can be deployed to:
- IIS (Windows Server) - Recommended for SERVER backend
- IIS Express (Development/Workstation) - For WORKGROUP backend
- nginx (Linux/Windows) - Configure similar to IIS
- Apache (Linux/Windows) - Configure similar to IIS
- Any static file web server
- CDN (for distributed deployments)

================================================================================
REQUIREMENTS
================================================================================

Server:
- Any web server capable of serving static files
- For IIS: Windows Server 2012+ or Windows 10/11
- For IIS: URL Rewrite module (for Angular routing)

Client Browser:
- Modern browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Cookies enabled (for session management)

================================================================================
IMPORTANT NOTES
================================================================================

- This is a static file deployment (no server-side processing)
- All application logic runs in the browser
- Backend API URL is configurable at runtime via config.json
- No rebuild required to change backend URL
- Same package works for both SERVER and WORKGROUP deployments
- web.config enables Angular routing (URL rewriting)
- All files must be readable by IIS user (typically IIS_IUSRS)

================================================================================
VERIFYING USER AUTHENTICATION
================================================================================

Once the frontend is working, verify that the database is correctly resolving
the connected user:

1. Open the application in your web browser

2. Navigate to: Connected User -> Who is this?

3. Check the username displayed at the right-hand end of the message bar

4. Verify that the username matches the Windows login

This confirms that:
- Windows Authentication is working correctly
- The backend is properly impersonating the user (SERVER deployment)
- The database is correctly resolving the user's Windows identity
- User-level access control is functioning

If the username is incorrect or shows the service account instead of the
actual username, check:
- Backend .env configuration (USE_KCD setting)
- IIS Windows Authentication settings (SERVER deployment)
- SQL Server connection string (Windows Authentication enabled)
- Service account permissions (WORKGROUP deployment)

================================================================================


