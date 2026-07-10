# Advanced Searching

## Introduction

This section covers searching for documents and files at access levels other than the unprivileged user.  

Note that *documents* are not the same as *files*.  Documents are an abstract entity that is used to relate files together, such as different releases or different renditions or format.  Documents have a parent-child relationship with files.  A search for documents is distinct from a search for files.  

There are many different commands which return a list of documents or files.  Below is a description of the overall structure of the system.

## Search Structure

A document or file search comprises three elements:

* The Search Criteria
* Permission Filtering
* Filter Group Filtering

A single search criterion consists of a metadata field, an operator, and one or more values.  For example:  `Release date between date x and date y`.

Permission filtering is automatically applied to filter out documents which the connected user does not have viewing rights to.

Filter group filtering applies a customizable filter.

This structure allows a high degree of flexibility in how searches return data.  However it is important that the underlying search structure be kept in mind when performing searches.  For example, with the default configuration, if a document ID has been newly created and has been assigned a publication status of `Reserved`, or no publication status has been assigned, then it will appear in a search of **Recently Created Documents** but it will be filtered out in a search of **Document ID Contains** because the **Document ID Contains** command will only display documents which have a publication status of `Current`.

## Filter Group Filtering

Some document and file search functions apply a mandatory filter group and some do not.  Whether or not a command applies a filter group will be indicated in the description of the command.  All search functions which are accessible to unprivileged users apply a mandatory filter group.  If no filter group is selected then a default filter group will be used.  Elyse ships with a default filter group configured which lists only documents which are currently published (as opposed to superseded or cancelled for example) and only files which are the current latest release and in the published format.  

Filter groups are configurable at Configurator role level.  Any number of filter groups can be created.

## Permission Filtering

The visibility of documents and files are determined by *[document groups](document-groups.md)*.  Permission filtering is flat and exclusive.  Permissions are not inherited by a hierarchical folder type structure.  This reduces the risk of sensitive documents being inadvertently exposed to unauthorized users.  Users who are members of a given document group can view documents, and files linked to those documents, within the document group.  Users who are not members of the group cannot view listings of those documents or files.  

Permissions are unrelated to access roles.  For example, a user with Authorizer privileges can grant a user membership of a document group but they cannot self-authorize membership of the group and will not be able to view documents or files within a group unless another Authorizer has granted them membership.

Permission filtering is applied to every document or file search.

## Search Criteria

To view a list of all of the search functions, open the [Command Palette](command-palette.md) and type `Select` into the **Actions** field.  To refine the list for document-related searches for example, enter `Documents` into the **Objects** field. 

The following data types are available for document and file metadata:

- Date
- Free text
- Integer
- Radio button lists
- Multi-select lists
- Real numbers
- Common object lists
- Cross references

Radio buttons are lists where the members of the list are mutually exclusive and only one item can be selected from the list at a time.

Multi-select lists are non-exclusive lists where more than one item can be selected at a time.

Common object type metadata can be either radio button lists or multi-select lists.  An example of a common object list name might be Contributing Organizations.  The common object might be XYZ Co.  Common objects can also be linked to attributes, such as Organization Name.  XYZ Co could be linked to either a document or a file through a multi-select list.

Cross references allow cross referencing between documents.  Cross references are grouped by cross reference type. 

For each of the above metadata types, any number of custom fields can be created via the Configurator level role.  

A document or file can be linked to any number of the above types of metadata attributes.  For example, a document can be linked to more than one radio button attribute, providing each is from a different list.

Document IDs and also files each have a number of one-to-one metadata fields.  Each document ID has an associated lock status (explained below).  Each document ID record also includes a record of when it was created and by whom.  Each file record has an associated filename, file size, an optional retention date and also a content hash.  The content hash is an SHA-256 hash of the content which is used for detecting duplicate files.  Each file record also includes a record of when it was created and by whom.

The intent of the document ID lock status is to permit a document ID to be locked against change.  A document ID can be locked by a Controller but can only be unlocked by a Configurator.  For example, once a document has been published and many other documents contain cross references to it via its document ID, the document ID should not be able to be changed.

Both documents and files can also be linked to a Transaction Group table.  This allows an otherwise random unrelated group of files for example to be grouped by a single identifier.  For example, if a batch of files are uploaded as a single group there may be a need to retrieve the group as a set later.  One document can only be linked to a single transaction group and one file can only be linked to a single transaction group.
