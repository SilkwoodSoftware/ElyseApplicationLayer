# Document Groups

## Overview

Documents can be grouped into Document Groups.  Document groups in turn are used for two purposes:

- Restricting the visibility of documents within the group

- Restricting the metadata editing rights of documents within the group

Restricting visibility of documents is defined by creating a direct link between a document group and a user.  Restricting metadata editing rights of documents is defined by linking a document group to a **Duty Function List** or a **People List**.  Users can be granted membership to these lists. 

## Document Viewing Groups

Document viewing groups are used to restrict access to documents and associated files.  This can be used for sensitive documents for example.  Any other document grouping purpose can be met using metadata.  Document viewing groups allow for collections of documents to be segregated between different groups of users such that users will have no visibility of documents or metadata of other groups, regardless of their role in the system.

The document viewing groups function works as follows.

* If there are no user IDs assigned at all → allow.
* If there are user IDs assigned, but the connected user's ID is not among them → exclude.
* If there are user IDs assigned, and the connected user's ID is among them → allow.

The workflow sequence for document viewing control is as follows.

1. A user with Configurator or Controller permissions creates a document viewer group name.  At this point any files linked to that document viewer group will be visible to anyone.
2. A user with Authorizer permissions links the document viewer group name to a user ID.  (The user must have already been onboarded.)  The Authorizer cannot self-authorize.  From this point onwards only users who are linked to the document viewer group will be able to see any records of documents linked to the document viewer group or add documents to the viewer group.  Any file which is linked to a document which is restricted will be restricted in the same manner as the document.
3. Controllers who have document view permission for a given document viewer group may link documents to the document viewer group.
4. If multiple document groups are linked to a document and the document viewer groups have different groups of users linked to the different document viewer groups then all users who are linked to the different document viewer groups will have rights to the document.
5. Document viewer group permissions are revoked by an Authorizer.  **Note:** Because documents are viewable by default if there are no users linked to a document viewer group, deleting the last user from a document viewer group will render all the documents of that group viewable to all users.  For this reason it is not possible for an Authorizer to delete the last user from a document viewing group unless there are zero documents linked to that group.

Documents are viewable by default.  A document only becomes restricted for viewing when there is at least one user linked to a document group via document group viewing permission.

## Document Editing Groups

### Overview

The following applies to Editor level permissions only.

Document group editing permissions function differently from document group viewing permissions.  Whereas document viewing groups are accessible for viewing by default, document editing is restricted by default.

Another difference between edit permissions and viewing permissions is that viewing permissions are managed at Authorizer role level whereas Editor level editing permissions are managed at Controller role level.

### How Document Group Editor Level Permissions Work

Document group edit permission grants an Editor role user permission to edit metadata associated with a document which is a member of a document group.  The authentication of document group edit permission first checks if the user has viewing permission for the document group and fails if the user does not have viewing permission.  Hence a user can be on a list which has document group editing permission but the permission will not be effective if the user does not also have viewing permission.

Only Controller and Editor roles can edit document metadata.  A Controller or Editor role user can only edit metadata for documents for which they have both viewing permission and edit permission.  A Controller can create a document group and grant access to an Editor.

There are two ways in which an Editor role user can gain metadata editing permission for a document.

- Being granted membership of a list which is linked to the document group which the document is a member of

- Creating a document ID and linking it to a document group which the user already has rights to

If a Controller adds a user with Editor role permissions to a **Duty Function** and the duty function in turn is a member of a **Duty Function List** which in turn is linked to the document group.  Similarly, if a Controller grants the user membership of a **People List** which in turn is linked through to a document group.  In either case, if there is a chain link from the document through the document group to the user then the user will have metadata editing rights.

A user with editing role permission can also create a document ID and specify a document editing group for which they already have editing permission.  When the document ID is created it will be automatically linked to that document group.  The user can therefore be given a sandbox within which they can create documents and then edit the metadata for the document they have created.

### Restricted Metadata Fields

Document radio button lists and file radio buttons lists include a column named *restricted*.  If the value of restricted is set to `True` then only a user with Controller role will be able to create or update a link between an attribute in that list and a document.  An example of how this feature can be used is for setting the publication status of a document.  An Editor may have permission to set various attribute values for a document they have edit permission for but be prevented from setting or changing the publication status.  Only a Controller would be able to set or change the publication status.
