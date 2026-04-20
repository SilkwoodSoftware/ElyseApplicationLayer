# Document Groups

## Overview

Document viewing groups are used to restrict access to documents and associated files.  This can be used for sensitive documents for example.  Any other document grouping purpose can be met using metadata.  Document viewing groups allow for collections of documents to be segregated between different groups of users such that users will have no visibility of documents or metadata of other groups, regardless of their role in the system.

## How Document Groups Work

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

Documents are viewable by default.  A document only becomes restricted for viewing when there is at least one user ID linked to a document group via document group viewing permission.
