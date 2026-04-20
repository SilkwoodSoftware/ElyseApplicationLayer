# File Viewing Rights

A user has permission to view a file if one of the following conditions are met:

1. The file is not linked to any document, or
2. The file is linked to a document and the document is not linked to any document viewer group, or
3. The file is linked to a document and the document is linked to one or more document viewer groups but no group is linked to a SID, or
4. The file is linked to a document and the document is linked to one or more document viewer groups linked to a SID which is linked to the user.

Hence a file can only have restricted viewing applied if it has been linked to a document ID.

A given document can be linked to multiple files.  One file can be linked to multiple documents.

If a file is linked to a document which is restricted and is also linked to another document which is not restricted, then listing the files for the unrestricted document will not list the file unless the user has viewing permission for it.
