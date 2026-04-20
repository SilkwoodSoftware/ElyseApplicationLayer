# Workflow Management

## Introduction

Apart from the operating system, the Elyse database is application layer agnostic.  It is designed to function independently of document file editing software and hence cater for any type of file produced by any existing or future file editing software.  The application layer may exploit the markup functionality of file editing software but will need to store the marked-up file separately from the original file.  In the interests of providing a secure immutable historical record, no functionality is provided to alter files stored in the database.  Files can only be either inserted or deleted.  Hence, simultaneous collaboration functionality must be handled at the application layer, either in the Elyse application or a different application.  If a finely grained and single comprehensive record of the history of all of the markups or changes and comments made to a file is required then the file must only be inserted into the database after all changes or markups have been completed.

## How Workflow Management Works

Creation of workflow models can only be performed by Configurator level roles.  Controllers link a workflow model to a document ID to create a workflow instance, and assign participants.  Editors link input files to a workflow instance to commence the review process.  Reviewers link output files, being the marked up reviews, to the workflow instance.

A workflow model defines the steps that are to be applied to a workflow.  Workflow instances comprise a copy of a workflow model as applied to a particular document for a particular instance.

Workflow models are defined using a graph database.  This defines the nodes and edges that comprise a graph.  Any type of graph can be created, including graphs with cycles.  The nodes of the graphs are referred to as workflow steps.  The edges are referred to as step transitions.  At each step transition there can be a defined workflow action.  For example: revise, review, approve, publish.  Each step transition can also be linked to one or more workflow rules.  An example of a rule might be 'all participants must respond', or 'time-limited review, after which progress proceeds automatically to the next step'.  Workflow rules can contain up to three integer values.  These values can be used by the application for purposes such as defining intervals for review expiry warning and review expiry.

A workflow instance links a single document with a workflow model.  Workflow instances contain steps which are linked to the workflow model step definitions.  Associated with a workflow instance definition is a present step identifier.  Each step can be linked to one or more input files.  Each workflow step can be linked to a step status definition, for example: planned, in progress, completed.  Each workflow instance step can contain up to three dates which can be used by the application for purposes such as recording start and end date of the step for example.  Each workflow instance step can be linked to one or more workflow step participants.  This links the step back to individuals.  The steps can also be linked to duty functions, which are in turn linked to individuals.  Each of the workflow step participants or duty functions can be linked to a workflow output definition, such as: approved, revise and resubmit, rejected.  Each of the workflow step participants or duty functions can also be linked to one or more output files.  These are the copies of document markups for example.  A separate copy is stored, rather than depending on the internal markup features of the file editing software.  Hence the step definition is linked with input files and the participants or duty functions linked to the step are linked to output files.

Any individual who is required to return a file as part of a workflow step must have editor or reviewer role permission to be able to add a file to the database and update the workflow step.

Workflow instance data is recorded in a track log.  The workflow track log is automatically triggered by the following events.

* A change to a workflow participant output record
* A change to a duty function output record
* A change to a workflow instance step status

Data in the track log table is a copy of the original data.  Hence the track log only records historical data and will not update when source data is changed.  Deleting workflow track log data can only be performed by a Database Administrator.

Viewing and editing permissions are applied to records in workflow management via checking the document which is linked to a workflow instance.  When retrieving workflow related records, including the track log, only records which are linked to a document which the user has viewing rights to will be retrieved.
