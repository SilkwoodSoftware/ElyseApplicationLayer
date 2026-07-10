# Audit Logs

## Overview

Elyse contains dedicated audit log tables for the following.

* Authorizer privilege requests
* User role granting
* User privilege revoking
* Read access to files
* Deleting of files
* Workflow management
* File and document metadata

A record of connected user and time stamp are also included in the following records.

- Booking log

- Document ID creation

- File creation

- Duty function to user link

- People list to user link

- Controller document group to user link

- Controller file group to user link

- Document group edit permission to function list link

- Document group edit permission to people list link

- Document group view permission to user link

- File group edit permission to function list link

- File group edit permission to people list link

- Form group viewer to user link

- Tag browsing tree to function list link

- Tag browsing tree to people list link

- Tag group to function list link

- Tag group to people list link

- Tag relationship tree to function list link

- Tag relationship tree to people list link

- Document to controller document group link

- Controller document group names

- Controller file to file group link

- Controller file group names

## Managing and Reading Audit Logs

Authorizer privileges requests are logged and can be viewed by Authorizers.

When privileges are granted to the user, the time and grantor are logged with the entry.  These can be viewed via the commands that list the privileges data.  When privileges are revoked the details are stored in a dedicated log.  This log can be viewed with Authorizer privileges by reading the Revoke Log.

The file read access log can be switched on and off by a Database Administrator via the **File Read Log** setting in Global Settings.  The file delete log can be switched on and off via the **File Delete Log** setting in Global Settings.  The file and document metadata changes log can be switched on an off via the **File Doc Change Log** setting in Global Settings.  Global Settings can only be modified, and log records can only be deleted, via direct Database Administrator access.

Various commands are available for Controllers to access reading log records.  Reading of file logs is filtered according to access privileges of the connected user.  That is, only files  and documents which the connected user has viewing rights to will be listed.

**Important:**  When a file has been deleted, the viewing rights restrictions are also deleted.  However the filename will still be listed in the logs and will no longer be restricted.  Hence the filenames of deleted files which were restricted prior to being deleted will be viewable to anyone with Controller level privileges after the file has been deleted.

The workflow track log can be viewed with Reader level privileges.  The workflow track log does not have an option for disabling it.

More finely grained audit logging can be achieved by configuring SQL Server audit log.
