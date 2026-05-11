# Basic Searching

## Basic Search Menu

The navigation bar is the grey bar at the top of the window.  Near the left is a menu **Basic Search**.  Click on that menu to reveal basic search options.

## Doc ID Equals

Search for an exact match of the document ID.  Document IDs are not case sensitive.

## Doc ID Contains

List documents IDs which contain the given string.

## Doc Title Contains

List documents where the title contains the given string.

## Docs by Radio Button List Attribute

List documents according to an attribute selected from a single-select list.

## Docs by Tag

List documents which are linked to a given tag.  See Introduction to Tags below.

## Filename Contains

List files where the filename contains the given string.

## File Content Search

List files which contain the given string.

Note that file content searching is dependent on file content indexing configuration.  If **Store Plain Text Content** was not enabled at the time when a file was loaded then file content searching will not be possible.  See **Information** > **Global Settings** to check if this feature is enabled.  The feature can only be enabled by a Database Administrator.

## File By File ID

Each file is assigned a unique integer file ID.  If you know the ID of a file then enter the number directly.  The complete number must be entered.

## Files by Radio Button List Attribute

List files according to an attribute selected from a single-select list.

## Filtering

If you are searching for a document or file which you know is in the database but which you cannot find then it is likely that it is being filtered out of search results by permission filtering or filter group filtering.  If a search is made by an exact identifier then the response will not distinguish between whether it does not exist or it does exist but is filtered out by filtering.  This ambiguity is intentional for security reasons.

## Files Linked to Documents

Document IDs are displayed with a hyperlink.  Clicking on the hyperlink will list any files linked to that document which pass the default filter, that is they are current latest release and in the published format.

## Result Tables

Tables displaying lists of documents or files have column tooltips.  Hover over a column heading to see a longer description of the column.  For example, the column **DBS** has a tooltip of **Document Booking Status**.

Clicking on a column heading will sort the table according to that column.

Tables can be exported to Excel by selecting the download icon (green down arrow) near the right hand end of the navigation bar.

The columns that are presented in a document or file results table are determined by the form.  If no form is specified then the default form registered in the Global Settings table will be used.  A user with Controller privileges can create any number of different forms for different purposes.

## Command Palette

For more advanced search commands use the Command Palette.
