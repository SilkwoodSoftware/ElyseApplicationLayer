# Introduction

## What is Elyse

The Elyse® DMS (Document Management System) is a high-integrity document management database platform designed for the purpose of managing controlled documents.

## Key Concepts

### Structure

A 'document' within a controlled document management system is an abstract entity to which files are related.  For example, a given document will have multiple releases (versions or revisions).  Each release will comprise one or more files, sometimes referred to as *renditions*.  For example, there will typically be a source file (.docx, .dwg) and a published file (.pdf).  Files are *related* to documents.  The document identifier is not merely an item of metadata of the file, it is an entity which has an existence separate from the file.  Documents can be thought of as the parent entity.  Files can be stored within Elyse without being related to a document, however for controlled document management purposes documents are the primary point of reference.

### Document Identifiers

An essential rule of controlled document management systems is that all documents must be uniquely identified.  In Elyse this rule is rigorously enforced.  An Elyse database has a single document ID register.  It is not possible to create duplicate document identifiers within the same Elyse database.

Document identifiers in Elyse are stored exactly the same as what the user sees.  There is no proxy or parallel document ID system.  Any string of up to 50 characters, of any type, can be used as a document identifier.  Hence legacy systems can be migrated to Elyse with the only constraint that each document ID must be unique.

### Files

Elyse is designed with data fidelity, auditability and tamper resistance as primary criteria.  These requirements are prioritized over other competing considerations.  Once a file has been loaded into an Elyse database it cannot be modified.  This provides a very high level of assurance in the integrity of file contents within the database.  It also means that all collaborative editing of files must occur prior to the file being loaded into Elyse.  If recording of fine grained editing history is required then the editing must be complete before the file with the embedded change tracking is loaded into Elyse.

Files are stored within an SQL Server FILESTREAM container.  The database is configured such that the files are only accessible via the database.

### Filtering

Elyse applies two methods to automatically filter lists of documents and files: permission filtering and filter group filtering.

Permission filtering ensures that restricted documents and associated files are only visible to appropriately authorized users.

Filter groups automatically filter documents and files according to pre-configured metadata criteria.  For example, filter group filtering is used to ensure that users without any additional privileges can only view the current latest release of documents and not superseded releases.

If you are searching for a document or file which you know is in the database but which you cannot find then it is likely that it is being filtered out of search results by permission filtering or filter group filtering.  If a search is made by an exact identifier then the response will not distinguish between whether it does not exist or it does exist but is filtered out by filtering.  This ambiguity is intentional for security reasons.
