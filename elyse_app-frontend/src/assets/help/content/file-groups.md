# File Groups

## Overview

File groups are used for managing rights to edit the metadata of files.  File groups are managed at Controller level.

Unlike document groups, file groups do not have a corresponding file viewing group permission.  File viewing restrictions are managed via linking of files to documents which in turn have viewing restrictions applied.  This avoids a clash between document viewing restrictions and viewing restrictions applied to files which are also linked to documents with a different set of restrictions.  There is only one set of viewing restrictions.  However, this arrangement also means that, unlike document groups, all users have permission to see all file groups.  With document groups, other than Authorizers, only users with permission to view a document group can view the details of the document group.  Hence file group details, such as name or description, should not be used for storing sensitive information.

## How File Groups Work

The following applies to Editor level permissions only.

File group edit permission grants an Editor role permission to edit metadata associated with a file which is within a file group.

File metadata editing is restricted by default.  A Controller role can edit any metadata for any file for which they have viewing permission and for which they are not excluded by controller level edit permission restrictions.  An Editor role can only edit metadata for a file for which they have viewing permission and edit permission.

The authentication of file edit permission first checks if the user has viewing permission for the file.  If the user has viewing permission for the file a check is then made to establish if there is a link from the file back to the user ID of the connected user.  The authentication will fail if there is not a link from the file to the user's ID.

File group edit permissions are managed at Controller role level.  However, an Editor role user can grant themselves permission to edit metadata of a file by linking the file ID to a file group, providing all of the following conditions are met:

1. The connected user has viewing permission for the file, and
2. The file is free from edit restrictions which exclude the current user, (i.e. the file has edit permissions for other users but not the connected user), or it has no edit permission restrictions at all, and
3. The connected user has edit permission for the file group which the file is to be linked to.  File edit permission for a user must be granted by a user with Controller level permission, except where the user creates a personal person list.

This allows an Editor role user to add a file and then edit the metadata for that file.  The user must first have edit permission for a file group.  An Editor role cannot delete a file to file-group link however.  Deleting the file to file-group link is a Controller role level function.  Otherwise an editor level role could remove file edit permissions from other users.

Note that a Controller level user can create, edit and delete file groups and they can grant file edit permissions but they cannot edit metadata for a file unless they have the required file edit permission.
