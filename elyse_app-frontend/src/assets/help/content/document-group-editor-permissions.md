# Document Group Editor Level Permissions

## Overview

The following applies to editor level permissions only.

Document group editing permissions function differently from document group viewing permissions.  Whereas document viewing groups are accessible for viewing by default, document editing is restricted by default.

Another difference between edit permissions and viewing permissions is that viewing permissions are managed at Authorizer role level whereas editor level editing permissions are managed at Controller role level.

## How Document Group Editor Level Permissions Work

Document group edit permission grants an Editor role user permission to edit metadata associated with a document which is a member of a document edit group.  The authentication of document group edit permission first checks if the user has viewing permission for the document group and fails if the user does not have viewing permission.  Hence a user can be on a list which has document group editing permission but the permission will not be effective if the user does not also have viewing permission.

Only Controller and Editor roles can edit document metadata.  A Controller or Editor role user can only edit metadata for documents for which they have both viewing permission and edit permission.  A Controller can create a document group and grant access to an Editor.

There are two ways in which an Editor role can gain editing permission for a document.  If a Controller adds a user with editor role permissions to the membership of a duty function list which is linked through to a document group then the user will have editing permission for any document within that group.  A user with editing role permission can also create a document ID and specify a document editing group for which they already have editing permission.  When the document ID is created it will be automatically linked to that document group.  The user can therefore be given a sandbox within which they can create documents and then edit the metadata for the document they have created.

Document radio button lists and file radio buttons lists include a column named *restricted*.  If the value of restricted is set to True then only a user with Controller role will be able to create or update a link between an attribute in that list and a document.  An example of how this feature can be used is for setting the publication status of a document.  An Editor may have permission to set various attributes for a document they have edit permission for but be prevented from setting or changing the publication status.  Only a Controller would be able to set or change the publication status.
