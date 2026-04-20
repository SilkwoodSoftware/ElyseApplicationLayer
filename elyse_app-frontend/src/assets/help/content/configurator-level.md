# Configurator Level Role

## Overview

The Configurator function is intended to manage the initial configuration of an Elyse database instance.  The configuration is primarily that of defining the field lists and field attributes which become the lookup tables for document and file metadata.  The Configurator also defines workflow models, which are templates defining workflows.  A Configurator can modify any form whereas a Controller can only modify forms for which they have permission to modify.

In contrast to the Controller role, the Configurator is a function that should rarely be required once the database has been initially set up.  Note that while there is some overlap between the two, the Configurator role does not have the same privileges as a Controller.

A Configurator is able to carry out the following tasks.

* Create and modify metadata field names for any given metadata type (e.g. radio button type with field name Publication Status)
* Create and modify metadata field list members (e.g. Publication Status list members of Published, Superseded, Cancelled, Reserved)
* Create and modify workflow models
* Create and modify filter groups
* Create and modify any form
* Create and modify a form group (but not manage membership of the form group)
* Create document groups (but not manage user membership of document group view permissions)
* Modify and delete document viewing group details for which the user has permission
* Edit user text field details (name, description, email address)
* Unlock a locked document ID
* Modify the date style
