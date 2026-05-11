# Loading Files

## Overview

Files can be loaded into Elyse by users with Reviewer, Editor or Controller role privileges.

In the Command Palette, enter `Upload` into the **Actions** field to display a list of commands for loading files.

## Upload Files With Data

The **Upload Files With Data** command allows multiple files to be loaded into Elyse and linked to a basic set of metadata.

Click the arrow next to the **Document ID** field to open a menu.  Select **Docs With Edit Permission**.  From the list that appears, select the document ID that you want to link the file to.  This field is optional.  If the file must have viewing restrictions applied then it must be linked to a document ID with viewing restrictions.  Otherwise the file will be visible to all users other than unprivileged users.  Selecting a document ID which has viewing restrictions will ensure that the file is immediately restricted and can only be viewed by authorized users.

The next field is **Editing Rights Document Groups**.  This is optional.  A selection from this list will link the document ID to the selected document edit group.  Document group edit permission grants an Editor role user permission to edit metadata associated with a document which is a member of a document edit group.  This action will not grant metadata edit permission which does not already exist, but will add the document to another group that the user has rights to.

Selecting an option from the **File Group** dropdown will link the file to a file group.  File group edit permission grants an Editor role permission to edit metadata associated with a file which is within a file group which the user is linked to.  If an Editor uploads a file but does not assign a File Group then only a Controller will be able to edit metadata for the file.

If **Enforced Retention** in Global Settings is On and a retention date has been set against a file then the file will not be able to be deleted until the retention date has passed.  If **Enforced Retention** is Off then the retention date will be stored but will not be enforced.  Selecting a fixed **retention period** will set a retention date.  Note that once a file retention date has been set there is no user facility to change the date.  Also, a retention period can only be set when a file is uploaded.  When **Enforced Retention** is on, a restricted file can only be deleted by a Database Administrator.  Alternatively, a new copy of the file can be re-loaded with a new retention date and the metadata re-linked to the new file.  Note that Elyse is shipped with **Enforced Retention** set to Off.  If **Enforced Retention** is required then the setting must be changed by a Database Administrator.

If **Duplicate Check** is set to On then Elyse will check each file to see if there is a matching file already in the database and reject it if there is.  The check is performed against the binary file content, not the filename.  If **Duplicate Check** in the form is not set then the **Duplicate Management** setting in Global Settings will be applied.  Otherwise the **Duplicate Check** field in the form will take precedence.  If a duplicate check is performed, a document ID has been supplied, and a single existing matching file is found, then the additional file will not be loaded but the file to document ID link will be created using the existing matching file and the file to file group link will be created.  In all other cases if there is at least one matching file found then the transaction will be rejected.

Select one or more files.  A table will be displayed with the file upload results.

## Upload Files

Files can be uploaded without metadata, using the **Upload Files** function.  However the metadata of the files will then not be editable by the Editor role level user.  Attempts to edit metadata by an Editor role level user will result in an error message being returned from the database.

## Upload File and Edit

The **Upload File and Edit** command can be used to select a single file and then immediately edit the associated metadata via an edit form.

## Size Limits

The maximum permissible file size is 2GB.

Indexing of text content will be truncated to 1 million characters.
