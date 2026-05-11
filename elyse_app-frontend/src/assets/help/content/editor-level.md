# Editor Level Role

## Overview

The Editor level role has all the privileges of the Reader level role, plus the following additional privileges:

* Creating new document IDs
* Loading of files
* Restricted editing of document and file metadata
* Restricted editing of tags, tag relationship trees and tag browsing trees

The Editor level role is for users who need to be able to load files into the database and edit metadata.  Editing of metadata is restricted to document and file groups which the user has been granted rights to by a user with Controller level privileges.

To view a list of all of the privileges you have been granted, go to the navigation bar and select **Connected User** > **List User Privileges**.

Note that by design it is not possible to edit the content of a file within an Elyse database.  'Editing' is restricted to editing of metadata only.

## Creating Document IDs

In the Command Palette enter `Create` into the **Actions** field and `Document` into the **Objects** field and select the command **Create and Edit Document ID (Editor Role)**.

The **Document Group** dropdown lists document groups for which either you have edit permission or which are unrestricted.  If there are none listed then you will not be able to create a new document ID.  Controller role permissions are needed to grant a user membership to a document edit group.

If auto-generation of document IDs is enabled then a new unique document ID will be automatically generated if the document ID field is left blank.  Otherwise the string entered into the field will be used.  The database is designed to securely handle strings containing any characters.

After the form is submitted a confirmation dialog will be displayed.  A data entry form then appears where metadata for the document ID can be edited.  Enter a title into the **Title** field and then press the **Add Field** (+ button) beside the field.  A confirmation dialog will appear, followed by a results dialog after the transaction has been completed.  The metadata fields which are available will depend on the configuration of the default form.  Users with Configurator role privileges can configure the form fields.

The command **Recently Created Documents** will list document IDs that were created in the interval defined by **Recently Created Duration** under Global Settings.

## Loading Files

Editor role privileges allows the loading of files.  See the Loading Files sub-topic below.

## Editing Metadata

In the Command Palette, enter `Edit` into the **Actions** field to display the commands for editing documents or files.  The edit form for a document or a file can also be opened via a context menu.  From a table of documents or files, select a single row, right click and then navigate to **Edit Document Data** or **Edit File Data**.

## Tagging

A user with Editor level role permissions can create tags via the **Create Document Tag** command.  In the Command Palette, enter `Tags` into the **Fields** field to display a list of all tag-related commands.  See the sub-topic on Tag Management below.

## Booking Management

A user with Editor level role permissions can book a document in and out.  In the Command Palette, enter `Booking` into the **Objects** field to display a list of all booking related commands.  See the sub-topic on Booking Management below.

## Workflow Management

An editor is able to manage the review workflow for a document for which they have metadata editing rights.

In the Command Palette, enter `Workflow` into the **Objects** field to display a list of all of the workflow-related commands.
