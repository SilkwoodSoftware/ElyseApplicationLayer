# Document Release Management

A document can comprise a series of releases.  A release has an associated **Release Type**, e.g. *Revision*, or *Version*, and a **Release Identifier**.   Elyse allows for releases to be identified by any text string.  For example, a release series might be: A, B, C, 0, 1, 2, 3.  Or it might be 1, 1A, 1B, 2, 2A, 3.  For a given document ID a release identifier must be unique.  

A release identifier creates a link between files and a document.  Each release can have any number of files linked to that release, for example a source file and a published rendition file.  The source may also comprise a set of files of different formats for example.  One file can be linked to only one release identifier, which in turn can be linked to only one document.  A release identifier must be created and linked to a document before it can be linked to a file.  

Separately from a release identifier link, a file may be directly linked to more than one document.  However the document that is linked via a release identifier is given special treatment.  This is the document that is displayed in file lists.  When a file is linked to a release identifier, if the document linked to the release identifier is not already linked to the file then a direct link will be automatically created at the same time.  Similarly, the direct link between a document and a file cannot be deleted if the file and document are also linked via a release identifier.   

Note that the visibility of files and documents is controlled via customizable [filter group](filter-groups.md) filters linked to metadata list fields such as **File Status**.  Release identifiers do not control visibility or metadata edit permissions.  The Elyse database layer does not, for example, control which release is the current release.  This means that a document release can be rolled back by changing the status metadata of files without interfering with the list of document release identifiers or copying any files.  The design also allows for a release to comprise more than just a source file and a corresponding published rendition file.  As an general operational rule there should only be a single file which is both the current latest release and also the published format rendition, as the master file.  All other linked files are support files.  However Elyse does not enforce this rule because the published document may comprise a PDF plus an associated data spreadsheet for example. 

For a list of all release-related commands, enter `Release` into the **Fields** field of the [Command Palette](command-palette.md). 

To create a document release, perform the following.

1. Locate the document ID.

2. Create a new release identifier for the document ID.

3. Link the file to the release identifier.

4. If the file is to be released as the current latest release, then change the File Status to `Current` and, if it is the published format file, change the Format to `Distribution File`.  Change the status of the superseded files to `Superseded`. 

If the **Release Lock** setting in global settings is set to `On` then updating and deleting of release-related records will be blocked.  This setting can only be changed by a database administrator.  Release Lock should only be set to `On` when these records are automatically created by the application layer rather than manually by the user. 
