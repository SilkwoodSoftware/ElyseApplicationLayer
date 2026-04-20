# Onboarding

## Elyse Access Control System

Elyse has a multi-layered and fine-grained privilege system.  All privileges beyond connecting to the database are managed within the Elyse database.  There are essentially two types of privileges.

* Role-based privileges
* Data-level privileges

Role based privileges grant a user rights to execute specific commands (stored procedures within the database).  If a user attempts to execute a command but does not have the appropriate role privilege mapped within the database then the command will exit without executing.

Data-level privileges grant access to privileged data, or performing actions on privileged data.  These privileges must be granted separately from role-based privileges.  For example, a user may have Editor level privileges but only for a particular group of documents.  When a command is executed to perform a particular task the database will first check if that user has the required privileges for that specific data.

## The Security Identifier

Elyse leverages Windows Integrated Security.  All authentication checks are made against the Windows security identifier (SID) of the connected user.  When Elyse carries out an authentication the database will directly query the security context to establish the identity of the user, which is the Windows account which the user is logged in to.  This is checked against a copy of the user's SID stored in access control lists within the database.  Hence before any privileges can be granted, your SID must first be registered in the database.  This is via a process called *self-onboarding* described below.

Note that if your Windows account is deleted and you are later given a new account then the SID will be different, even if the new account name is exactly the same.

## Self-Onboarding

If you need to request privileges beyond unprivileged access then you must first register your SID in the database.  This can only be done from *your* Windows account via Elyse.  It cannot be performed by anyone else from a different account.

On the grey navigation bar at the top of the window, select **Connected User** > **Self Onboard**.  A message dialog will indicate either that the command was successful or that the user is already registered.  The command **Connected User** > **Who Is This?** can also be used to confirm the security context account which the database sees.  The username is at the right of the message label box returned.

Note that self-onboarding merely adds your SID to a list in the database.  It does not have any functional impact until specific privileges are granted.  Also, privileges cannot be granted to you until your SID has been onboarded.

## Privilege Requests

After self-onboarding you must contact a user with Authorizer level privileges to request the required role-based privilege.  Further data-level privileges can then be granted either by an Authorizer or Controller depending on the particular privilege type.  For example, viewing access to a restricted group of documents may be granted by an Authorizer by adding you to the associated document group, or metadata editing rights for a group of files may be granted by a Controller by adding you to a file edit group.
