# Controller Level Role

## Overview

The Controller function is intended to manage day-to-day administrative functions such as populating and updating metadata fields.  There is some overlap between Controller and Configurator and also Editor functions.  The main task that a Controller can carry out which an Editor cannot is editing forms.  A Controller can also create, edit and delete Document Groups, which are used for restricting visibility of groups of documents.  The main task that a Configurator can perform which a Controller cannot is creating metadata fields.

The Controller level role has all the privileges of the [Reader](reader-level.md) and [Editor](editor-level.md) level roles, plus the following additional privileges:

* Lock a document ID so it cannot be altered (can only be unlocked by a Configurator)
* Edit metadata for any document or file that they have viewing rights to, (with the exception of those restricted by Controller level groups)
* Create and edit forms
* Be granted privileges of a form group owner.  Only form group owners can edit forms within a given form group.
* Create and modify tag relationship trees
* Create and modify tag browsing trees
* Book in any booked-out document
* Initiate document workflow instances
* Edit user text field details (name, description, email address)
* Manage metadata lists such as duty functions and people lists
* Grant document and file editing privileges to Editors
* Create document groups (but not manage user membership of document group view permissions)
* Modify and delete document viewing group details for which the user has permission
* Read the content of the read log and delete log
* Search for any user ID

In the Command Palette, enter `Forms` into the **Fields** field to display a list of form commands.

Note that a Controller cannot see documents and the metadata of documents which are restricted via document group permissions which they do not have permission for.

## Document Searching

When searching for documents it is important to remember that some searches apply a [filter group](filter-groups.md) and others do not.  **Recently Created Documents** for example does not apply a filter group.  

## Locking Document IDs

Because document IDs often must appear as cross-references on documents external to the document management system and external to the organization, (such as correspondence), once a document ID has been set it should never be changed.  A document ID can be locked by a Controller.  However, in the event that a document ID needs to be unlocked again, a document ID can only be unlocked by a Configurator. 

Document IDs can be locked when they are created by setting the **Id Lock Status** to `Locked`.  Alternatively, the **Lock Document ID** command can be used to lock a document ID which is unlocked.  

## Editing Metadata

Refer to the [Forms](forms.md) section for an introduction to how forms work in Elyse.  

When a file is loaded using the Upload File and Edit command, the form permits the file to be linked to a document ID when it is uploaded.  Once the file has uploaded a page will appear with all of the metadata fields for the default form.  Document-related fields are displayed with blue shading and file-related fields are displayed with green shading.  Against each field are four buttons: **Update**, **Delete**, **Save** and **Revert**.  Fields can be individually edited and saved, or alternatively a number of fields can be changed and saved together with the **Save Changes** button.  

The command **Create Document ID & Edit Data** opens a metadata editing page after the document ID has been created. 

When a document or file record has been selected in a table, right click on the row and navigate to **Edit Document Data** or **Edit File Data** to open the metadata editing page.  

At the bottom of the metadata editing page is a row of data which includes the **Form Name**.  A different form can be selected from the Form dropdown field in the Edit Document Data and Edit File Data forms.  

Note that if a document or file is linked to a **Controller Document Group** or **Controller File Group** then editing rights will be restricted to Controllers who are members of the given group.  See the [Controller Groups](controller-groups.md) section for more detail.  

## Forms

Refer to the [Forms](forms.md) section for an introduction to the form system.

For a list of all of the form-related commands, enter `Forms` into the **Objects** field in the [Command Palette](command-palette.md).

## Form Group Ownership

A Controller can create and edit forms.  However in order to have exclusive editing rights to a form the form must be linked to a form group and the user granted ownership of that form group. 

## Tag Relationship Trees

Refer to the [Tag Management](tag-management.md) section for an explanation of tags.  

Controllers can create and modify **Tag Relationship Trees** and **Tag Browsing Trees**.  Enter `Tag Relationship Trees` or `Tag Browsing Trees` into the **Fields** field in the [Command Palette](command-palette.md) to list the applicable commands. 

## Document Booking Management

Refer to the [Booking Management](booking-management.md) section for an explanation of the booking management system.  

A Controller can book in any document for which they have edit permission rights and which is currently booked out.

On the [Command Palette](command-palette.md), enter `Booking` into the **Objects** field to display a list of all booking-related commands.

## Workflow Management

Refer to the [Workflow Management](workflow-management.md) section for an explanation of the workflow management system. 

Controllers link a workflow model to a document ID to create a workflow instance, and assign participants.

On the [Command Palette](command-palette.md), enter `Workflow` into the **Objects** field to display a list of all workflow-related commands.

## Edit User Details

The text fields of a user record can be updated by Authorizers, Configurators and Controllers via the **Update User** command.

## User-Related Lists

Controllers manage duty functions, function lists and people lists.  Refer to the [User-Related Lists](user-related-lists.md) section for further details.  On the [Command Palette](command-palette.md), enter `Duty Function`, `Function List` or `People List` to list all the commands for each.

## Document Groups

[Document groups](document-groups.md) are used to restrict visibility of sensitive documents to authorized users.  Any files linked to a restricted document will be restricted in the same way.

Document groups can only be created, modified and deleted by a Controller.  But only an Authorizer can link users to a document group and hence restrict visibility of documents linked to the group to users who are linked to the group.

Entering `Document Viewing Groups` into the **Fields** field of the [Command Palette](command-palette.md) will list all of the document viewing group related commands.

## Audit Logs

Controllers can read the file read and file delete [audit logs[(audit-logs.md)].  Entering `Log` into the **Fields** field of the [Command Palette](command-palette.md) will list all of the audit log related commands.

## Users

Enter `Users` into the Objects field of the [Command Palette](command-palette.md) to list all of the user-related commands. 
