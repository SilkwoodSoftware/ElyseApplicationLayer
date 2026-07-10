# Demo Database Primer

The following is a primer introduction to Elyse, using the demonstration database.

## Doc Title Contains

From the navigation bar select **Basic Search** > **Doc Title Contains**.

On the form which appears, select the **Contains** field and enter `Food`.

Click **Submit**.

Click on a hyperlink under the **Document ID** column.

A table now appears which lists the file for the latest release for that document.

Select a row by left clicking, then right click and click **View File Details With Thumbnail**.  A thumbnail of the first page together with a table of all of the metadata associated with the file will be displayed.

Clicking on the File ID hyperlink will download the file.

## Doc ID Equals

From the navigation bar select **Basic Search** > **Doc ID Equals**.

On the form that appears, select the **Document ID** field and type `LVPL`.

Click **Submit**.

A listing for the document ID LVPL is returned.

This function searches the Document ID field in the database for an exact match.  If the document ID was not listed in the database, or was not accessible to the connected user, then no results would be returned.  This function is very specific and does not search any other fields, or search the content of files for example.

## Forms

Repeat the **Doc ID Equals** search again, only this time on the form, in addition to entering `LVPL` into the **Contains** field, select **Long Form** from the **Form** dropdown.

The results are now displayed using a different form which has more fields.  Hover the mouse over the column heading **DCB** for example.  A tooltip will appear with the full description of the column, **Document Created By**.

Forms are customizable by users with Configurator or Controller role privileges.

## Tags

From the navigation bar, select **Basic Search** > **Docs by Tag**.

From the form that appears, select the **>** button beside the **Tag** field.  Select **Tag Contains**.

In the popup form **Tags by Name**, select the **String Contains** field and type `saf`.  Then select **Submit**.

From the table that appears, select the row containing the Tag Name 'Safety'.  Click **Confirm** to return to the **Documents by Tag** form.  The tag has now been selected for the **Tag** field.

Ignore the other fields on the form and click **Submit**.  A table of documents will appear.

Clicking on the text of the column heading **Title** will sort the list by that column.

Left click the row for the document with the title *Hazard Identification Procedure* (but not on the hyperlink under **Document ID**).

Now that the table row has been selected, right click to open the context menu.  Select **Document Details**.

A list of all of the metadata linked to this document is displayed.

Note that at the bottom of this table there is only one tag listed: 'Hazard Identification'.  Yet the tag that was used for searching was 'Safety'.  This is because the search included a default Tag Relationship Tree.  Tag relationship trees are hierarchical tag trees which define parent-child relationships between tags.  'Hazard Identification' is listed as a descendant of 'Safety'.

If the same search as above is repeated but the **Tag Descendants** field on the **Documents by Tag** form is selected to `Off`, then the Hazard Identification Procedure will not be listed.

Tag relationship trees can be used to drastically reduce the number of tags which must be linked to a document.

## Content Searching

From the navigation bar, select **Basic Search** > **File Content Search**.

On the form that appears, select the **Contains** field and enter `Quality`.

Click **Submit**.

A list of all files containing the word 'Quality' will be displayed.

More advanced file content searching functions are available under **Advanced** > **Search** > **Files** > **File Content Searching**.  Hover over each menu item for more details.

## Command Palette

Click the ⌘ button to open the Command Palette.

In the **Actions** field type `Select` and press **Enter**.

A complete list of all of the available select-related commands will be displayed.  Note that not all of these commands will return results, depending on what metadata has been entered into this database.

Clear the previous search term by clicking the **x** next to it.

In the **Fields** field of the Command Palette enter `Tags` and press **Enter**.

A list of all of the commands related to tags will be displayed.
