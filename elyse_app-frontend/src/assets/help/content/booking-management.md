# Booking Management

An editor or controller can **book out** any document which they have edit permission for and which has not already been booked out.

An editor can **book in** any document they have booked out and still have edit permission rights to.  A controller can book in any document for which they have edit permission rights and which is currently booked out.

When a document is booked in, a single **file** can be linked to the book in record in the same transaction.  Additional files can be linked to the same booking transaction record, providing it is still the most recent record for that document.  Adding additional files to a book-in record must be completed within the time from when the document was booked in, as set by the **Booking In Time Box** setting in Global Settings.

A booked-in transaction can be **deleted** by the person who created it, providing that it is within the booking in time box set in Global Settings, plus the following constraints.  The booking transaction must be the most recent booking ID for that user for that document and it must be a booked-in record.  If the booking transaction ID is still that which is against the document ID then the booking status is reverted to the previous booked-out ID.  Otherwise, if the booking transaction ID against the document ID does not match the one being deleted then the document ID booking record field remains unchanged.

When a document is booked out, a comment can be added to the transaction.

When a document is booked in, a comment can be added, plus also a release number.  The database is designed on the premise that a document controller must manually carry out QA checks to ensure a document file is in order and has been properly authorized before being released as a published document.  The database does not automatically process and release files to published document status.

Release numbers are intended to be entirely free format, allowing organizations to use any desired format and to even change the format from one release to the next if necessary (e.g. Revision 6 being superseded by Revision 6a).  Since the immutable file storage security architecture of Elyse means that the database does not participate in file editing in any way, the database cannot automatically synchronize a release number stored within the database with that printed on the document, while still at the same time allowing unconstrained free format release numbers and unconstrained file formats and filenames.  The task of ensuring that the release number printed on the document matches that recorded in the database must be managed by the user, or otherwise by an application layer which automates and constrains what is sent to the database.

On the Command Palette, enter `Booking` into the **Objects** field to display a list of all booking-related commands.
