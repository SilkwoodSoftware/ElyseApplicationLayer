# Creating Document IDs

Document IDs can be created in one of three ways.

If a document ID is entered then that is the document ID that will be created, providing that a duplicate does not already exist.

The **User Auto-Gen Doc ID On Null** setting in Global Settings switches the creation process to automatically generate a document ID if a document ID has not been entered.  The **Doc ID Format** setting in Global Settings determines if the automatically generated ID is either an alpha string or an integer.  The column can contain `Alpha`, `Integer` or `NULL`.  If the auto-generate format is integer then the procedure will read the value from **Doc ID Last Integer** value in Global Settings, add 1 to it, and assign the value to the document ID.  If the format is not Integer then the procedure will generate a document ID as a random string of letters of length determined by the **Auto-Gen Doc ID Length** setting in Global Settings.

A register code prefix can be automatically applied to an auto-generated document ID.  The purpose of the register code is to distinguish between different registers that might otherwise have overlapping document IDs.  Globally Unique Identifiers (GUIDs) are too long to be useful for human use.  A company could use its stock ticker as the register code for example, or a short random string of letters.  Then if two companies merge, the registers can be combined without clashing document IDs.  A register code could also be used by a large organisation that wants to allow different sections of the same organisation to independently manage separate registers but without the document IDs clashing.  The register code is enabled by the **Is Register Code Applied** setting in Global Settings.  When a document ID is auto-generated the register code contained in the **Register Code** field will be pre-pended to the document ID, separated by a dash.

With the exception of **Date Style**, Global Settings can only be altered by a Database Administrator.
