# Authorizer Level Role

## Overview

The Authorizer function is for managing the granting and revoking of privileges.  With the exception of creating and modifying Controller-level document groups and file groups, the function does not have any modifying privileges other than those related to granting and revoking privileges.

An Authorizer is able to carry out the following tasks.

* Grant and revoke a user a role privilege
* De-activate and restore a user account
* Grant and revoke a user access to a document viewing group
* Grant and revoke a user access to a Controller-level document group
* Grant and revoke a user access to a Controller-level file group
* Grant and revoke a user access to a form group owner list
* Edit user text field details (name, description, email address)
* View privileges for any user

## Managing User Roles

User roles can be managed via the **Manage User Roles** dialog box.  This is available via the context menu for any list of users.  For example, use the [Command Palette](command-palette.md) to execute a command to find the user, such as **Recent Users**, or **Users by Name**.  Then select the row on the table, right click and navigate to the **Manage User Roles** command.  Select one or more roles to authorize or remove and then select **Submit**.  A dialog will be displayed with the results of the transactions.

The **User Roles**, **Users by Role** and **Privileges by User** commands will list when the role privilege was granted and by whom.  

## Granting and Revoking Authorizer Privileges

In order to be able to grant Authorizer privileges to an account, without requiring Database Administrator access to the database, the database must have at least two different Windows accounts registered as Authorizers.  The first two Authorizers must be configured by a Database Administrator during deployment.  Each new grant requires approval of two separate Authorizers.  Each revoke also requires the approval of two Authorizers.  The system will not permit the number of Authorizers to be less than two.

The process for granting Authorizer privileges to a user is as follows.

1. The user must be onboarded into the system via the self-onboard function.
2. First Authorizer: Find the user via one of various user search commands.  Select the user and execute the **Grant Authorizer** command.  A dialog will appear stating *One of two approvals for authorizer privilege grant request*.
3. Second Authorizer: Must not be the same as the first Authorizer.  From the Command Palette execute the **Authorizer Requests** command to display a list of grant requests.  Select the request, right click and execute **Grant Request**.  The second Authorizer can also reject the grant request.
4. A message will confirm the transaction.

The process for revoking of Authorizer privileges from a user is as follows.

1. First Authorizer: Must not be the same user.  Select the user from a list and execute the **Revoke Authorizer** command in the context menu.
2. Second Authorizer: Must not be the same as the first Authorizer nor the Authorizer to be revoked.  Locate the grant request on the **Authorizer Requests** table.  Select the request and execute the **Revoke Authorizer** command.  The second Authorizer can also reject the revoke request.
3. A message will confirm the transaction.  The transaction will be rejected if the revoke request will reduce the number of Authorizers to less than two.

The **List Authorizers** command will list all current Authorizers.

## De-Activating and Restoring a User Account

An Authorizer can de-activate a user account in a single action by executing the **Delete User** command.  When a user's Elyse account has been deactivated the **Windows Account Current** column will display `No`.  The account can be restored again by executing the **Restore User** command.  If the user being restored has Authorizer privileges linked to the account then the restore will fail.  The Authorizer privileges must be removed from the user before the account can be restored after having been de-activated.  For audit record reasons, a user account can never be completely removed from the system, it can only be de-activated.

Note that if a user is given a new Windows Account then the account will have a new security identifier (SID).  Windows Account SIDs cannot be re-used.

## Document Viewing Groups

[Document groups](document-groups.md) are used to restrict visibility of sensitive documents to authorized users.  Any files linked to a restricted document will be restricted in the same way.

Document groups can only be created, modified and deleted by a Controller.  But only an Authorizer can link users to a document group and hence restrict visibility of documents linked to the group to users who are linked to the group.

Entering `Document Viewing Groups` into the **Fields** field of the [Command Palette](command-palette.md) will list all of the document viewing group related commands.  

## Controller-Level Document and File Groups

Edit permissions for metadata are divided into two layers.  At the first layer are permissions that are granted by Authorizers to Controllers.  These are referred to as Controller-level permissions.  This gives members of the group exclusive metadata editing rights that cannot be altered by other Controllers.

Controller-level file and document group permissions can only be granted by Authorizers.  These permissions give members of the group exclusive metadata editing rights that cannot be altered by other Controllers.

If a user is linked to a Controller editing group but does not also have Controller rights, or later ceases to have Controller rights, then the Controller-level edit permission authentication will fail.

An application of the above structure would be as follows.  In a large organization, Controllers in different branches of the organization must be able to view organization-wide published documents but must not be able to edit the metadata of such documents unless they have been explicitly granted that permission.  Hence Controller-level permissions should only need to be altered if the organization structure changes.  Controllers would be granted specific Controller-level permissions by being added to a given Controller-level edit permission group.  Within a branch of an organization, Controllers must be able to grant document owners permission to edit metadata of documents which they own.  This is managed through Editor level permissions.  However Editor level permissions are overridden by Controller level permissions.

The Controller document group commands can be listed by entering `Controller Document Group` into the **Fields** field in the [Command Palette](command-palette.md), and Controller file group commands by entering `Controller File Group`.

## Form Group Owners

See the [Forms](forms.md) section for an explanation of form groups.  

The form group commands can be listed by entering `Form Groups` into the **Fields** field in the [Command Palette](command-palette.md).

## Edit User Details

The text fields of a user record can be updated by Authorizers, Configurators and Controllers via the **Update User** command. 

## View User Privileges

The **Privileges By User** command will list all of the privileges for a given user.  This command is only available to Authorizers. 
