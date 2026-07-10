# Controller Groups

## Metadata Edit Permissions Overview

Edit permissions for metadata are divided into two layers.  At the first layer are permissions that are granted by Authorizers to Controllers.  These are referred to as Controller level permissions.  This gives members of the group exclusive metadata editing rights that cannot be altered by other Controllers.  If a user is linked to a Controller editing group but does not also have Controller rights, or later ceases to have Controller rights, then the Controller level edit permission authentication will fail.

The second layer of edit permissions are permissions that are granted by Controllers to Editors.  These are referred to as Editor level permissions.  Any Controller can alter any Editor level permissions.  Any Controller can also edit the metadata of any document or file which they are not excluded from through Controller level permissions.  A Controller can grant Editor level permissions to any user.  The edit permissions authentication does not check if the user has Editor rights for Editor level permissions, however a user will not be able to perform Editor functions if they do not have Editor level rights because the role authentication check will fail.

An application of the above structure would be as follows.  In a large organisation, Controllers in different branches of the organisation must be able to view organisation-wide published documents but must not be able to edit the metadata of such documents unless they have been explicitly granted that permission.  Hence Controller level permissions should only need to be altered if the organisation structure changes.  Controllers would be granted specific Controller level permissions by being added to a given Controller level edit permission group.  Within a branch of an organisation, Controllers must be able to grant document owners permission to edit metadata of documents which they own.  This is managed through Editor level permissions.  However Editor level permissions are overridden by Controller level permissions.

In the Command Palette select the **Name/Description Search** button and type `Controller` into the search field to display a list of all Controller level related commands.

## How Controller Groups Work

Controller level permissions are divided into controller document groups and controller file groups.  Only Authorizers can create and modify these groups and grant or revoke membership to a group.  Authorizers cannot self-authorize.

Once a Controller has been granted membership of a controller document group or controller file group then they are able to link a document or a file to a respective group.  The metadata for that file or document will then only be able to be edited by members of that group.
