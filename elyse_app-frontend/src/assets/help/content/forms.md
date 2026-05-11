# Forms

## Overview

All metadata for documents and files can only be presented via a form definition, with the exception of document details and file details tables which list all the metadata for a single document or file respectively.  Document and file metadata editing form pages also use forms.  Hence the set of metadata which is presented for editing will depend on which form has been selected.  Form fields are user configurable by creating a link between a form ID and a metadata field.

## How Forms Work

Forms can only be created by Controllers.  Any number of forms can be created.  One form can contain a mixture of both document links and file links.

The **Default Form ID** listed in Global Settings will be applied if no form is specified when listing documents or files or opening a metadata editing form.

A form can be linked to a form group.  Controllers are granted permission to be form group owners by an Authorizer.  A user who is a Controller and also a form group owner will be able to create and modify forms which are linked to a form group which they are an owner of.  A user can be granted permission as a form owner but if they are not also a Controller then they will not be able to modify a form belonging to that form group.  A Controller can also create and modify forms which are not linked to any form group.  A Configurator can create or modify any form, including forms which are not linked to any form group.  Hence if a Configurator creates a form which is linked to a form group which in turn is not linked to any Controllers then only a Configurator will be able to modify a form linked to that form group.

The following field types can be linked to documents.

* Free text
* Dates
* Radio button lists
* Multi-select lists
* Common object multi-select lists
* Common object radio button lists
* Integers
* Duty functions
* Duty function lists
* Real numbers
* Transaction group
* Document ID lock status
* People lists
* Document booking status
* Document booking comments
* Document booking date
* Document booking release number
* Document booking user ID
* Document booking user name
* ID of the user who created the document ID
* Name of the user who created the document ID
* Date when the document ID was created

The following field types can be linked to files.

* Free text
* Dates
* Radio button lists
* Multi-select lists
* Common object multi-select lists
* Common object radio button lists
* Integers
* Duty functions
* Function lists
* Real numbers
* Filename
* File content hash
* Transaction group
* File size
* People lists
* ID of the user who uploaded the file
* Name of the user who uploaded the file
* Date when the file was uploaded
