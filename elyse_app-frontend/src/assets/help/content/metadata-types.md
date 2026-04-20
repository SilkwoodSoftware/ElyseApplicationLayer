# Elyse Metadata Basics

## Categories of Metadata

Elyse divides metadata into a variety of different categories.

* Document-related metadata
* File-related metadata
* Metadata which can be linked to either documents or files, referred to as *common objects*.
* People-related metadata (e.g. duty function or role title)
* Special metadata fields

## Metadata Types

Across different categories of metadata are various metadata types.

* Free Text
* Integer
* Dates
* Real Numbers
* Radio Button Lists
* Multi-Select Lists

A user with Configurator role privileges can create any number of different metadata fields of a given type.

Elyse is pre-configured with **Document Title** as a free text field.  The title field is not hard-coded but it is registered as the default document free text field in Global Settings.  Any number of free text fields can be configured.  For example: abstract, description, summary, change notes.

**Next review date** is a date type field which is registered in Global Settings as the default document date field.  This is how documents with expired review dates are retrieved.

Radio button lists are lists of attributes where only one item from the list can be selected at one time.  For example, publication status.

Multi-select lists are lists where more than one item from the list can be selected at one time.

Integer and real number metadata fields can also be linked to a Units of Measure field.

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
