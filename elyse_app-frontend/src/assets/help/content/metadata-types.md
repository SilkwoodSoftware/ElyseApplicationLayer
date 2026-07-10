# Elyse Metadata Basics

## Metadata Fields

Elyse uses an extensible attribute system.  Any number of additional fields can be created by users with Configurator-level role privileges.

Metadata fields comprise either **Open-Input Fields** or **Entity-Reference Fields**.

**Open-input fields** allow users to manually enter a literal value.  Each open-input field must have a field name, e.g. *Title*.  Open-input fields are related to either documents or files, and when linked to the document or file object they are bound directly as a *value-based link*.  Open-input fields may be created from one of the following data types.

- Free Text

- Date

- Integer

- Real Number

The name of a field for a given data type and object type must be unique.

Integer and real number metadata fields can also be linked to a **Units of Measure** field.

**Entity-reference fields** present a predefined list of options.  Instead of storing a value, these fields link directly to the unique ID of the list member, creating a *relational link*.  The name of the list member will only ever exist in one place.  So if the list member name is changed then the change will appear universally.

Entity-reference fields comprise the following types.

- Radio Button Lists

- Multi-Select Lists

Radio button lists are lists from which only one member can be selected at a time.  For example, a document cannot be both *current* and *cancelled* at the same time.  Multi-select lists allow more than one member to be selected from the list.  For example, a document may be both a *form* and also a *guide*.

Entity-reference fields fall into the following categories.

- Document-related

- File-related

- Common object related

Document-related entity-reference fields can only be linked to documents, and file-related only related to files, whereas **common object** type entity-reference fields may be linked to either documents or files. 

## Pre-Configured Fields

Elyse is pre-configured with a number of metadata fields.

### Document Free Text Fields

- Document Title.  This is registered as the default document free text field in Global Settings.  

- Abstract

- Description

### Document Integer

- Review Interval

### Document Date

- Next review date is a date type field which is registered in Global Settings as the default document date field.  This is how documents with expired review dates are retrieved.

### Document Radio Button Lists

- Publication Status

- Document Type

### File Radio Button Lists

- File Status

- File Format

### File Date

- Date of Issue

### File Free Text

- Release Number

- Author

- Change Notes

## Special Metadata Fields

Some metadata fields have specific special purposes.

* Transaction groups
* Booking management data
* Document ID lock status
* Audit data

Other metadata fields are related to fixed attributes of objects.

* Filename
* File size
* File content hash

**Transaction groups** are used to group any arbitrary group of documents or files so that the same list can be retrieved later.  For example if a group of files is loaded into Elyse then every file in the group can be assigned the same transaction group.

**Booking management data** is used to control booking documents out and in.

**Document ID lock status** indicates if a document ID has been locked so that it cannot be altered without elevated privileges.

**Audit data** is automatically stored against various records.  This includes when the record was created and by whom.

**File content hash** is an SHA256 hash of the content of a file.  This is used for duplicate management.  If duplicate management is enabled then Elyse will prevent loading of duplicate files.

Documents can also be grouped into **document groups** and files grouped into **file groups**.  Document groups are used as part of permission filtering to restrict access to documents and associated files to authorized users.  File groups are used for managing rights to edit the metadata of files.

## How Metadata is Used

Metadata is generally used for sorting, grouping and controlling objects.  This is distinct from tags which are generally used to describe and locate objects.  An analogy is that metadata is like the table of contents at the front of a book while tags are like an index at the back of the book.
