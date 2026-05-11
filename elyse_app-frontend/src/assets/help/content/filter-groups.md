# Filter Groups

Filter groups are groups of metadata fields that are used to automatically filter results.  For example, when retrieving a list of documents the application may need to display data according to the following rules.

1. Only list document IDs which have a Document Status of Published, as opposed to Reserved or Superseded for example.
2. Only list files linked to a given document ID which have a File Status of Current Latest Release, as opposed to Superseded for example, and also have a File Format of Distribution Format, as opposed to Source File for example.

By creating a filter group with Document Status equals Published, File Status equals Current Latest Revision and File Format equals Distribution Format, results can be retrieved which comply with the above rules.  When a new release of a document is issued the file status of the old release must be changed to Superseded and the File Status of the new file must be set to Current Latest Release.  The filter group then automatically ensures that users are only presented with the current latest release.  Source files can be stored in the same database but retrievable via a channel which is separate from that which returns the distribution format files.  Superseded files also remain in the same database and are also retrievable only via a channel which is separate from that which returns the current latest release.  A Controller must ensure that the metadata is correct and consistent, but the filter group will take care of how the data is presented.

Filter groups can also be used for other purposes such as providing easy access to pre-filtered lists, such as a list of department-specific documents.

Of the various commands which retrieve document and file data, some apply a filter group and some do not, depending on the context.

A filter group can contain no members and hence not apply any filtering.  Such blank filter groups should generally not be created since this can be used to bypass the restriction on access to superseded documents.

The Global Settings has a default filter group.  This is used for the filter group which will filter documents and files to only present those which are current.  Hence the application is configured such that search forms for unprivileged users do not have an option to select an alternative filter group.  To select alternative filters, or execute commands that provide unfiltered lists, requires explicit role privileges to be granted.
