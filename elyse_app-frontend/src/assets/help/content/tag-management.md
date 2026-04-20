# Tag Management

## Purpose of Tags

Document tags are used primarily for sorting, grouping and finding documents.  They are used like an index usually found at the back of a book, as opposed to a table of contents and publication details found at the front of a book.  Tags differ from other types of metadata fields in that they are intended to be flexible as opposed to rigidly fixed, and are potentially large in number.  Tags are also useful for categorizing attributes which may not be contained within the document itself, such as for non-text-based documents such as drawings and images.  An Elyse database contains a central register of tag names.

## Tag Relationship Trees

In an Elyse database tags can be arranged in a taxonomical hierarchical tree, referred to as a Tag Relationship Structure (TRS), or tag tree.  In the TRS a reference to a tag automatically refers to any descendant tags in the way that reference to 'fasteners' inherently includes reference to both bolts and nuts for example.  This means that a document tagged only with the tag 'bolts' can be retrieved with a search of the tag 'fasteners' if the TRS includes the parent-child relationship between fasteners and bolts to indicate that bolts are fasteners.  The TRS represents a Boolean logic OR combination of a given tag and all of its descendants.

## Tag Browsing Trees

A type of tree separate from the TRS, referred to as a browsing tree, represents a logical AND of the tag at that node and all of the ancestors above the node.  This allows a user to construct a structure through which a progressively narrower search is conducted by progressing down the tree.  Unlike a TRS, browsing trees don't impact the function of a tag.  They comprise what may be considered a structure of saved searches.  Each node on the tree is like a saved search.  A node in a browsing tree can also be inverted such that documents with the tag at that node, and any of its descendants in the TRS, will be excluded.  This is a logical NOT.  Hence when used in combination with tags arranged in a TRS, a browsing tree node can construct any Boolean logic combination of tags.

## Searching Using Tags

Tags are only linked to documents, not files.  When conducting a search of documents by tag, a single TRS may be specified.  If a TRS is not supplied then the default from the Global Settings table will be used.  Use of TRS can be turned off by setting the **Tag Descendants** field to `OFF`.  In the Command Palette enter `Select` into the **Actions** field and `Tags` into the **Fields** field to display a list of applicable commands.

## Tag-Related Editing Restrictions

The following are the types of tag-related permissions:

* Permission to link tags to a given document
* Permission to edit a given tag
* Permission to link a given tag to a given tag group
* Permission to edit a tag relationship tree
* Permission to edit a tag browsing tree

With one exception, tag-related permissions are managed via duty function lists.  Hence, for each permission type there is a table linking to function lists.  Authentication of a permission is established if there is a path through to the connected user.  The exception to the function list is a personal browsing tree that can only be linked to one reader user.

Permissions to link tags to tag groups, edit tag trees and edit tag browsing trees can be created or modified by any controller.  Permissions to link tags to documents can be created or modified by any controller who has viewing rights for the given document group.

## Permission to Link Tags to Documents

Permission to link a tag to a document is determined by the metadata editing restrictions of the document.

Document editing is restricted by default.  There are two ways in which an Editor role can gain editing permission for a document.  If a controller adds a user with Editor role permissions to the membership of a duty function list which is linked through to a document group then the user will have editing permission for any document within that group.  A user with editing role permission can also create a document ID and specify a document editing group for which they already have editing permission.  When the document ID is created it will be automatically linked to that document group.  The user can therefore be given a sandbox within which they can create documents and then edit the metadata for the document they have created.

## Creating and Editing Tags

Tags can be created by any user who has either controller or editor role.

A user has permission to edit a tag if either there is no chain from a tag through a tag group through to any user, or if the tag is linked to a tag group that the user has rights to.  Controllers have rights to edit any tag by default.

Hence, if an editor creates a tag then at that point the tag can be edited or deleted by any other editor.  The editor can then link the tag to a tag group that they have rights to.  From that point on only editors who have rights to the given tag group can edit the tag.  Any controller can link the tag to any other tag group and hence grant editing rights for the tag to a different editor who does not have rights to the first tag group.  A tag may only be linked to a tag group if the connected user has both edit rights to the tag and also rights to the tag group.

## Tag Groups

Tag groups are used to segment the management of tags.  For example, a business section may have their own tag group that they manage.  Tag groups can only be created by controllers.  A user has permission for a tag group if there is a chain from the tag group through either a function list or a people list to a user ID.  Controllers have rights to any tag group by default.

## Permission to Edit a Tag Relationship Tree or Tag Browsing Tree

Tag trees can be linked to duty function lists and people lists.  Only members of the associated lists can edit a tag tree.

A user has permission for a tag tree if there is a chain from the tag tree ID through either a function list or a people list to a user ID.  Controllers have rights to edit any tag tree by default.

Only a controller may create a new TRS.  But once created, the TRS nodes can be edited by anyone who has been granted edit permission for that tag tree.  To add a tag to a tag tree the user must also have edit rights for the given tag.  This is because even though the tag itself isn't being changed, the function of the tag is being changed.

Tag browsing tree permissions grant a user permission to modify a given tag browsing tree.  The editing permissions for browsing trees are managed in the same way as for tag trees by linking through to duty function lists and people lists, with the following additional permissions.  All Controllers may edit any tag browsing tree.  If a user is linked directly to a tag browsing tree then they may edit the tag browsing tree.

A user with Reader role privileges can have one or more tag browsing trees that are linked directly to the user.  The user can create and edit a personal tag browsing tree.  A Controller can edit and delete another user's personal tag browsing tree.
