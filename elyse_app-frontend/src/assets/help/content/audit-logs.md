# Audit Logs

## Overview

Elyse has audit logs for the following.

* Authorizer privilege requests
* User privileges
* Read access to files
* Deleting of files
* Workflow management

## Managing and Reading Audit Logs

Authorizer privileges requests are logged and can be viewed by Authorizers.

When privileges are granted to the user, the time and grantor are logged with the entry.  These can be viewed via the commands that list the privileges data.  When privileges are revoked the details are stored in a dedicated log.  This log can be viewed with authorizer privileges by reading the Revoke Log.

The file read access log can be switched on and off by a Database Administrator via the **File Read Log** setting in Global Settings.  The file delete log can be switched on and off via the **File Delete Log** setting in Global Settings.  Global Settings can only be modified, and log records can only be deleted, via direct Database Administrator access.

Various commands are available for Controller to access reading log records.  Reading of file logs is filtered according to access privileges of the connected user.  That is, only files which the connected user has viewing rights to will be listed.

**Important:**  When a file has been deleted, the viewing rights restrictions are also deleted.  However the filename will still be listed in the logs and will no longer be restricted.  Hence the filenames of deleted files which were restricted prior to being deleted will be viewable to anyone with controller level privileges after the file has been deleted.

The workflow track log can be viewed with Reader level privileges.  The workflow track log does not have an option for disabling it.

Various tables include the automatic recording of when the record was made and by whom.

More finely grained audit logging can be achieved by configuring SQL Server audit log.
