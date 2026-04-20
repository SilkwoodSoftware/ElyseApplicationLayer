# Introduction to Elyse Tags

## Fundamentals

In Elyse, the primary objects are documents.  Tags can be used for finding documents.

In the Command Palette, enter `Tags` into the **Fields** field to display a list of all the available commands relating to tags.  Select **All Tags** for example to display a list of all available tags.  Select a row, then right click and select **Documents By Tag**.  This will display any documents which are linked to that tag.

## Tag Relationship Trees

Elyse uses a system called Tag Relationship Trees to define hierarchical relationships between tags.  For example, nuts and bolts are both fasteners.  A tag relationship tree can be used to create parent-child relationships to reflect this.  Hence if a document has the tag 'bolts' linked to it and a search is made using the tag 'fasteners' then the document with the tag 'bolts' will be returned, even though it does not have the tag 'fasteners' linked to it.  The database knows that bolts are fasteners.

In the Command Palette find the command **Tag Relationship Tree Names** to display a list of tag relationship trees.  Select a row, then right click and select **Tag Tree Details** to display a table representing the tree.

## Tag Browsing Trees

Tag Browsing Trees are a type of cascading saved searches.  Each node on the browsing tree represents a logical AND of the tag at that node and all of the ancestors above the node.  Unlike relationship trees, browsing trees don't impact the function of a tag.

In the Command Palette find the command **Tag Browsing Tree Names** to display a list of tag browsing trees.  Select a row, then right click and select **Browsing Tree Details**.  This will display a table representing the browsing tree.  Select a row, then right click and select **Documents By Browsing Tree Node**.
