# Controller Level Role

## Overview

The Controller function is intended to manage day-to-day administrative functions such as populating and updating metadata fields.  There is some overlap between Controller and Configurator and also Editor functions.  The main task that a Controller can carry out which an Editor cannot is editing forms.  The main task that a Configurator can perform which a Controller cannot is creating metadata fields.

The Controller level role has all the privileges of the Reader level role, plus the following additional privileges:

* Lock a document ID so it cannot be altered (can only be unlocked by a configurator)
* Edit metadata for any document or file that they have viewing rights to, (with the exception of those restricted by Controller level groups)
* Create and edit forms
* Be granted privileges of a form group owner.  Only form group owners can edit forms within a given form group.
* Create and modify tag relationship trees
* Create and modify tag browsing trees
* Book in any booked-out document
* Initiate document workflow instances
* Edit user text field details (name, description, email address)
* Manage metadata lists such as duty functions and people lists
* Grant document and file editing privileges to editors
* Create document groups (but not manage user membership of document group view permissions)
* Modify and delete document viewing group details for which the user has permission
* Read the content of the read log and delete log
* Search for any user ID

In the Command Palette, enter `Forms` into the **Fields** field to display a list of form commands.

Note that a Controller cannot see documents and the metadata of documents which are restricted via document group permissions which they do not have permission for.
