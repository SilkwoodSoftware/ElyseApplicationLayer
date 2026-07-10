# Configurator Level Role

## Overview

The Configurator function is intended to manage the initial configuration of an Elyse database instance.  The configuration is primarily that of defining the field lists and field attributes which become the lookup tables for document and file metadata.  The Configurator also defines workflow models, which are templates defining workflows.  A Configurator can modify any form whereas a Controller can only modify forms for which they have permission to modify.

In contrast to the Controller role, the Configurator is a function that should rarely be required once the database has been initially set up.  Note that while there is some overlap between the two, the Configurator role does not have the same privileges as a Controller.

A Configurator is able to carry out the following tasks.

* Create and modify [metadata](metadata-types.md) field names for any given metadata type (e.g. Title, Abstract, Summary)
* Create and modify dropdown field lists (e.g. Publication Status)
* Create and modify field list members (e.g. Publication Status list members of Published, Superseded, Cancelled, Reserved)
* Create and modify [workflow models](workflow-management.md)
* Create and modify [filter groups](filter-groups.md)
* Create and modify any [form](forms.md)
* Create and modify a form group (but not manage membership of the form group)
* Create document groups (but not manage user membership of document group view permissions)
* Modify and delete document viewing group details for which the user has permission
* Edit user text field details (name, description, email address)
* Unlock a locked document ID
* Modify the date style

## Metadata Fields

To create and edit metadata fields, open the [Command Palette](command-palette.md) and select the **Name/Description Search** button.  Enter the desired field type, e.g. Free Text, and find the desired command, e.g. Create, Update or Delete.

When a radio button list is created there is an option to restrict the field.  If the value of restricted is set to `True` then only a user with Controller role will be able to create or update a link between a member in that list and a document.  An example of how this feature can be used is for setting the publication status of a document.  An Editor may have permission to set various metadata for a document they have edit permission for but be prevented from setting or changing the publication status.  Only a document Controller would be able to set or change the publication status.

## Workflow Models

See the [Workflow Management](workflow-management.md) section for an introduction to workflow management.  To create and manage workflow models, open the [Command Palette](command-palette.md), select the **Name/Description Search** button and enter `Workflow`.  Start by creating **Workflow Actions** (e.g. Review, Approve).  Then create the **Workflow Step Definitions**.  Finally, link the workflow step definitions together with **Workflow Step Transitions**.

## Filter Groups

See the [Filter Groups](filter-groups.md) section for an introduction to filter groups.  

To create a new filter group, open the [Command Palette](command-palette.md), select the **Name/Description Search** button and enter `Create Filter Group`.  

After creating a filter group name, add rules using the following commands.

- `Create File Radio Button List Member to Filter Group Link`

- `Create File Multi-Select List Member to Filter Group Link`

- `Create Document Radio Button List Member to Filter Group Link`

- `Create Document Multi-Select List Member to Filter Group Link`

A filter group can contain no members and hence not apply any filtering.  Such blank filter groups should generally not be created since this can be used to bypass the restriction on access to superseded documents.  All users have access to all filter groups.

## Forms

See the [Forms](forms.md) section for an introduction to forms. 

To create a new form, open the [Command Palette](command-palette.md), select the **Name/Description Search** button and enter `Form Identifier` to locate the `Create Form` command.  After creating the form, populate the form with links to metadata fields using commands which can be found by searching `Create Form To`.

When a form is created it can be linked to a **Form Group**.  

## Form Groups

Each form can be linked to one form group.  Form groups in turn are used for managing form editing privileges.

Controllers are granted permission to be form group owners by an Authorizer by linking the user to a form group.  A user who is a Controller and also a form group owner will be able to create and modify forms which are linked to a form group which they are an owner of.  A user can be granted permission as a form owner but if they are not also a Controller then they will not be able to modify a form belonging to that form group.  A Controller can also create and modify forms which are not linked to any form group.  A Configurator can create or modify any form, including forms which are not linked to any form group.  Hence if a Configurator creates a form which is linked to a form group which in turn is not linked to any Controllers, then only a Configurator will be able to modify a form linked to that form group.

Open the [Command Palette](command-palette.md), select the **Name/Description Search** button and enter `Form Group` to list all form group related commands. 

The form group for a given form can be updated with the command **Update Form Group for Form**.

## Document Groups

See the [Document Groups](document-groups.md) section for an introduction to document groups. 

Open the [Command Palette](command-palette.md), select the **Name/Description Search** button and enter `Document Group` to list all document group related commands.

Note that document groups are for the purpose of restricting viewing rights to documents.  Use tags or other [metadata fields](metadata-types.md) to group documents.  

## Edit User

The Elyse database stores a username separately from the Windows system username.  A Configurator may edit the database username, description and email address for a user via the `Update User` command. 

## Unlock a Document ID

Because document IDs often must appear as cross-references on documents external to the document management system and external to the organization, (such as correspondence), once a document ID has been set it should never be changed.  A document ID can be locked by a Controller.  However, in the event that a document ID needs to be unlocked again, a document ID can only be unlocked by a Configurator.  Refer to the `Unlock Document ID` command. 

## Date Style

The Elyse application layer will use a default date style that is recorded within the database global settings list.  This can be set by a Configurator using the `Update Default Date-Time Style` command. 
