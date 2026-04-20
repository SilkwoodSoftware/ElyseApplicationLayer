# Authorizer Level Role

## Overview

The Authorizer function is for managing granting and revoking privileges.  With the exception of creating and modifying controller-level document groups and file groups, the function does not have any modifying privileges other than those related to granting and revoking privileges.

An Authorizer is able to carry out the following tasks.

* Grant and revoke a user a role privilege
* De-activate and restore a user account
* Grant and revoke a user access to a document viewing group
* Grant and revoke a user access to a controller-level document group
* Grant and revoke a user access to a controller-level file group
* Grant and revoke a user access to a form group owner list
* Edit user text field details (name, description, email address)
* View privileges for any user

## Managing User Roles

User roles can be managed via the **Manage User Roles** dialog box.  This is available via the context menu for any list of users.  For example, use the Command Palette to execute a command to find the user, such as **Recent Users**, or **Users by Name**.  Then select the row on the table, right click and navigate to the **Manage User Roles** command.  Select one or more roles to authorize or remove and then select **Submit**.  A dialog will be displayed with the results of the transactions.

## Granting and Revoking Authorizer Privileges

In order to be able to grant Authorizer privileges to an account, without requiring Database Administrator access to the database, the database must have at least two different Windows accounts registered as authorizers.  The first two authorizers must be configured by a Database Administrator during deployment.  Each new grant requires approval of two separate authorizers.  Each revoke also requires the approval of two authorizers.  The system will not permit the number of authorizers to be less than two.

The process for granting authorizer privileges to a user is as follows.

1. The user must be onboarded into the system via the self-onboard function.
2. First Authorizer: Find the user via one of various user search commands.  Select the user and execute the **Grant Authorizer** command.  A dialog will appear stating 'One of two approvals for authorizer privilege grant request.'
3. Second Authorizer: Must not be the same as the first Authorizer.  From the Command Palette execute the **Authorizer Requests** command to display a list of grant requests.  Select the request, right click and execute **Grant Request**.  The second Authorizer can also reject the grant request.
4. A message will confirm the transaction.

The process for revoking of authorizer privileges from a user is as follows.

1. First Authorizer: Must not be the same user.  Select the user from a list and execute the **Revoke Authorizer** command in the context menu.
2. Second Authorizer: Must not be the same as the first Authorizer nor the Authorizer to be revoked.  Locate the grant request on the **Authorizer Requests** table.  Select the request and execute the **Revoke Authorizer** command.  The second Authorizer can also reject the revoke request.
3. A message will confirm the transaction.  The transaction will be rejected if the revoke request will reduce the number of authorizers to less than two.

## De-Activating and Restoring a User Account

An Authorizer can de-activate a user account in a single action by executing the **Delete User** command.  The account can be restored again by executing the **Restore User** command.  If the user being restored has authorizer privileges linked to the account then the restore will fail.  The authorizer privileges must be removed from the user before the account can be restored after having been de-activated.  A user account can never be completely removed from the system, it can only be de-activated.

Note that if a user is given a new Windows Account then the account will have a new security identifier (SID).  Windows Account SIDs cannot be re-used.

## Document Viewing Groups

Document groups are used to restrict visibility of sensitive documents to authorized users.  Any files linked to a restricted document will be restricted in the same way.

Document groups can only be created by Controller and Configurator level roles.  But only an Authorizer can link users to a document group and hence restrict visibility of documents linked to the group to users who are linked to the group.
