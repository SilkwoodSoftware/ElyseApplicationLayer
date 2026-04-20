/*
 * Copyright 2025 Silkwood Software Pty. Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using AutoMapper;
using System.Linq;
using System.Data.SqlClient;
using Microsoft.AspNetCore.Http;

public abstract class BaseStoredProcedureController : ControllerBase
{
    protected readonly StoredProcedureService _storedProcedureService;
    protected readonly ILogger _logger;
    protected readonly IMapper? _mapper;
    protected readonly IdFieldTypesProvider? _idFieldTypesProvider;

    protected BaseStoredProcedureController(StoredProcedureService storedProcedureService, ILogger logger, IMapper? mapper, IdFieldTypesProvider? idFieldTypesProvider = null)
     {
        _storedProcedureService = storedProcedureService ?? throw new ArgumentNullException(nameof(storedProcedureService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _mapper = mapper;
        _idFieldTypesProvider = idFieldTypesProvider;
    }



    protected string? GetOutputParameterValue(StoredProcedureResult result, string parameterName)
    {
        return StoredProcedureHelpers.GetOutputParameterValue(result, parameterName, _logger);
           }    

    protected List<Dictionary<string, object>> TransformDocumentData(List<Dictionary<string, object>> documentData)
    {
        if (documentData == null || !documentData.Any())
        {
             return new List<Dictionary<string, object>>();
        }
        // Check if the expected keys are present in the first row
        var firstRow = documentData.First();
        if (!firstRow.ContainsKey("Record") || !firstRow.ContainsKey("Mnemonic") || !firstRow.ContainsKey("Units") || !firstRow.ContainsKey("Value"))
        {
            _logger.LogWarning("The document data does not contain the expected keys. Returning empty result.");
             return new List<Dictionary<string, object>>();
        }

        // Group the data by "Record"
        var groupedData = documentData.GroupBy(row => row["Record"]);

        // Collect all unique column names
        var uniqueColumns = new Dictionary<string, (string FieldType, string Name)>();
        foreach (var row in documentData)
        {
         string mnemonic = row.ContainsKey("Mnemonic") && row["Mnemonic"] != null ? row["Mnemonic"].ToString() : "";
         string units = row.ContainsKey("Units") && row["Units"] != null ? row["Units"].ToString() : "";
         string columnName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
         string fieldType = row.ContainsKey("Field Type") && row["Field Type"] != null ? row["Field Type"].ToString() : "";
         string fieldName = row.ContainsKey("Form Field Name") && row["Form Field Name"] != null ? row["Form Field Name"].ToString() :
                           row.ContainsKey("Name") && row["Name"] != null ? row["Name"].ToString() : "";
         uniqueColumns[columnName] = (fieldType, fieldName);
        }
        // Check if File ID column exists in the data (regardless of values)
        bool hasFileIdColumn = documentData.Any(row => row.ContainsKey("File ID"));

        // Ensure "Document ID" is always included
        uniqueColumns["Document ID"] = ("Document ID", "Document identifier");
        
        // Include "File ID" if the column exists, even if all values are empty
        if (hasFileIdColumn)
        {
            uniqueColumns["File ID"] = ("File ID", "File identifier");
        }

        // Create the output list
        var outputData = new List<Dictionary<string, object>>();

        foreach (var group in groupedData)
        {
            var row = new Dictionary<string, object>();

            // Set the "Document ID" as the first column
            var firstRowInGroup = group.First();
            string documentIdValue = firstRowInGroup.ContainsKey("Document ID") && firstRowInGroup["Document ID"] != null ? firstRowInGroup["Document ID"].ToString() : "";
            row["Document ID|Document identifier"] = new Dictionary<string, string>
            {
                {"Column Name", "Document ID"},
                {"Value", documentIdValue}
            };

           // Find and set the "File ID" only if it exists in uniqueColumns
            if (uniqueColumns.ContainsKey("File ID"))
            {
                // Get any row that has the File ID column, regardless of value
                var fileIdRow = group.FirstOrDefault(r => r.ContainsKey("File ID"));
                row["File ID|File identifier"] = new Dictionary<string, string>
                {
                    {"Column Name", "File ID"},
                    {"Value", fileIdRow != null ? fileIdRow["File ID"]?.ToString() ?? "" : ""}
                };
            }

            // Fill in the values for each column
            foreach (var columnInfo in uniqueColumns)
             {
                var columnName = columnInfo.Key;
                var (fieldType, name) = columnInfo.Value;

                if (columnName != "Document ID" && columnName != "File ID")
                {
                    var matchingRow = group.FirstOrDefault(r =>
                {
                    string mnemonic = r.ContainsKey("Mnemonic") && r["Mnemonic"] != null ? r["Mnemonic"].ToString() : "";
                    string units = r.ContainsKey("Units") && r["Units"] != null ? r["Units"].ToString() : "";
                    string fullName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
                    return fullName == columnName;
                });

                    row[$"{fieldType}|{name}"] = new Dictionary<string, string>
                    {
                        {"Column Name", columnName},
                        {"Value", matchingRow != null ? matchingRow["Value"]?.ToString() ?? "" : ""}
                    };
            }
           }

            outputData.Add(row);
        }

        return outputData;
    }

    protected List<Dictionary<string, object>> TransformDocDataExFiles(List<Dictionary<string, object>> documentData)
    {
        if (documentData == null || !documentData.Any())
        {
             return new List<Dictionary<string, object>>();
        }
        // Check if the expected keys are present in the first row
        var firstRow = documentData.First();
        if (!firstRow.ContainsKey("Record") || !firstRow.ContainsKey("Mnemonic") || !firstRow.ContainsKey("Units") || !firstRow.ContainsKey("Value"))
        {
            _logger.LogWarning("The document data does not contain the expected keys. Returning empty result.");
             return new List<Dictionary<string, object>>();
        }

        // Filter out rows where File ID contains a value (not null/empty)
        var filteredData = documentData.Where(row =>
        {
            if (row.ContainsKey("File ID") && row["File ID"] != null)
            {
                string fileIdValue = row["File ID"].ToString();
                return string.IsNullOrEmpty(fileIdValue);
            }
            return true; // Keep rows that don't have File ID column
        }).ToList();

        if (!filteredData.Any())
        {
            return new List<Dictionary<string, object>>();
        }

        // Group the filtered data by "Document ID" to ensure only one record per document
        var groupedData = filteredData.GroupBy(row => row.ContainsKey("Document ID") ? row["Document ID"] : row["Record"]);

        // Collect all unique column names (excluding File ID)
        var uniqueColumns = new Dictionary<string, (string FieldType, string Name)>();
        foreach (var row in filteredData)
        {
         string mnemonic = row.ContainsKey("Mnemonic") && row["Mnemonic"] != null ? row["Mnemonic"].ToString() : "";
         string units = row.ContainsKey("Units") && row["Units"] != null ? row["Units"].ToString() : "";
         string columnName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
         string fieldType = row.ContainsKey("Field Type") && row["Field Type"] != null ? row["Field Type"].ToString() : "";
         string fieldName = row.ContainsKey("Form Field Name") && row["Form Field Name"] != null ? row["Form Field Name"].ToString() :
                           row.ContainsKey("Name") && row["Name"] != null ? row["Name"].ToString() : "";
         uniqueColumns[columnName] = (fieldType, fieldName);
        }

        // Ensure "Document ID" is always included (but NOT File ID)
        uniqueColumns["Document ID"] = ("Document ID", "Document identifier");

        // Create the output list
        var outputData = new List<Dictionary<string, object>>();

        foreach (var group in groupedData)
        {
            var row = new Dictionary<string, object>();

            // Set the "Document ID" as the first column
            var firstRowInGroup = group.First();
            string documentIdValue = firstRowInGroup.ContainsKey("Document ID") && firstRowInGroup["Document ID"] != null ? firstRowInGroup["Document ID"].ToString() : "";
            row["Document ID|Document identifier"] = new Dictionary<string, string>
            {
                {"Column Name", "Document ID"},
                {"Value", documentIdValue}
            };

            // Fill in the values for each column (excluding File ID)
            foreach (var columnInfo in uniqueColumns)
             {
                var columnName = columnInfo.Key;
                var (fieldType, name) = columnInfo.Value;

                if (columnName != "Document ID") // Only exclude Document ID, File ID is already not in uniqueColumns
                {
                    var matchingRow = group.FirstOrDefault(r =>
                {
                    string mnemonic = r.ContainsKey("Mnemonic") && r["Mnemonic"] != null ? r["Mnemonic"].ToString() : "";
                    string units = r.ContainsKey("Units") && r["Units"] != null ? r["Units"].ToString() : "";
                    string fullName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
                    return fullName == columnName;
                });

                    row[$"{fieldType}|{name}"] = new Dictionary<string, string>
                    {
                        {"Column Name", columnName},
                        {"Value", matchingRow != null ? matchingRow["Value"]?.ToString() ?? "" : ""}
                    };
            }
           }

            outputData.Add(row);
        }

        return outputData;
    }

     protected List<Dictionary<string, object>> TransformFilesData(List<Dictionary<string, object>> fileData)
    {
        if (fileData == null || !fileData.Any())
        {
            return new List<Dictionary<string, object>>();
        }

        // Check if the data has the expected structure for transformation
        var firstRow = fileData.First();
        
        // If the data doesn't have the expected keys for transformation, return as-is
        if (!firstRow.ContainsKey("Mnemonic") || !firstRow.ContainsKey("Field Type"))
        {
            _logger.LogWarning("The file data does not contain the expected transformation keys (Mnemonic, Field Type). Returning original data.");
            return fileData;
        }

        // Determine grouping strategy
        IEnumerable<IGrouping<object, Dictionary<string, object>>> groupedData;
        
        if (firstRow.ContainsKey("Record"))
        {
            // Standard grouping by Record
            groupedData = fileData.GroupBy(row => row["Record"]);
        }
        else if (firstRow.ContainsKey("File ID"))
        {
            // Fallback: group by File ID if Record is missing
            groupedData = fileData.GroupBy(row => row["File ID"]);
            _logger.LogWarning("Record key not found, grouping by File ID instead.");
        }
        else
        {
            // Last resort: treat all data as a single record
            groupedData = new[] { fileData.GroupBy(row => "single_record").First() };
            _logger.LogWarning("Neither Record nor File ID keys found, treating all data as single record.");
        }

        // Collect all unique column names
        var uniqueColumns = new Dictionary<string, (string FieldType, string Name)>();
        foreach (var row in fileData)
        {
            string mnemonic = row.ContainsKey("Mnemonic") && row["Mnemonic"] != null ? row["Mnemonic"].ToString() : "";
            string units = row.ContainsKey("Units") && row["Units"] != null ? row["Units"].ToString() : "";
            string columnName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
            string fieldType = row.ContainsKey("Field Type") && row["Field Type"] != null ? row["Field Type"].ToString() : "";
            string fieldName = row.ContainsKey("Form Field Name") && row["Form Field Name"] != null ? row["Form Field Name"].ToString() :
                              row.ContainsKey("Name") && row["Name"] != null ? row["Name"].ToString() : "";

            uniqueColumns[columnName] = (fieldType, fieldName);
        }

        // Create the output list
        var outputData = new List<Dictionary<string, object>>();

        foreach (var group in groupedData)
        {
            var row = new Dictionary<string, object>();

            // Set the "File ID" as the first column if it exists
            var fileIdRow = group.FirstOrDefault(r => r.ContainsKey("File ID"));
            if (fileIdRow != null)
            {
                row["File ID|File identifier"] = new Dictionary<string, string>
                {
                    {"Column Name", "File ID"},
                    {"Value", fileIdRow["File ID"]?.ToString() ?? ""}
                };
            }

            // Fill in the values for each column
            foreach (var columnInfo in uniqueColumns)
            {
                var columnName = columnInfo.Key;
                var (fieldType, name) = columnInfo.Value;

                var matchingRow = group.FirstOrDefault(r =>
                {
                    string mnemonic = r.ContainsKey("Mnemonic") && r["Mnemonic"] != null ? r["Mnemonic"].ToString() : "";
                    string units = r.ContainsKey("Units") && r["Units"] != null ? r["Units"].ToString() : "";
                    string fullName = string.IsNullOrEmpty(units) ? mnemonic : $"{mnemonic} - {units}";
                    return fullName == columnName;
                });

                row[$"{fieldType}|{name}"] = new Dictionary<string, string>
                {
                    {"Column Name", columnName},
                    {"Value", matchingRow != null ? matchingRow["Value"]?.ToString() ?? "" : ""}
                };
            }

            outputData.Add(row);
        }

        return outputData;
    }

    protected List<Dictionary<string, object>> TransformWorkflowModelData(List<Dictionary<string, object>> workflowData)
    {
        if (workflowData == null || !workflowData.Any())
        {
            return new List<Dictionary<string, object>>();
        }

        // Check if the data has the expected structure for workflow model transformation
        var firstRow = workflowData.First();
        
        if (!firstRow.ContainsKey("Field Type") || !firstRow.ContainsKey("Sequence"))
        {
            _logger.LogWarning("The workflow model data does not contain the expected keys (Field Type, Sequence). Returning original data.");
            return workflowData;
        }

        // Group by Sequence to get one row per workflow step
        var groupedData = workflowData.GroupBy(row => row["Sequence"]);

        var outputData = new List<Dictionary<string, object>>();

        foreach (var group in groupedData)
        {
            var row = new Dictionary<string, object>();
            var firstInGroup = group.First();

            // 1. Add Sequence (step number - always first column)
            row["Sequence|Step Number"] = new Dictionary<string, string>
            {
                {"Column Name", "Sequence"},
                {"Value", firstInGroup["Sequence"]?.ToString() ?? ""}
            };

            // 2. Add Workflow Model Step ID
            if (firstInGroup.ContainsKey("Workflow Model Step ID"))
            {
                row["Workflow Model Step ID|Step ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "Workflow Model Step ID"},
                    {"Value", firstInGroup["Workflow Model Step ID"]?.ToString() ?? ""}
                };
            }

            // 2a. Add Step Transition ID (from Transition or Action rows)
            var transitionRow = group.FirstOrDefault(r =>
                r.ContainsKey("Step Transition ID") &&
                r["Step Transition ID"] != null &&
                r["Step Transition ID"] != DBNull.Value &&
                !string.IsNullOrEmpty(r["Step Transition ID"].ToString()));
            
            if (transitionRow != null)
            {
                row["Step Transition ID|Step Transition ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "Step Transition ID"},
                    {"Value", transitionRow["Step Transition ID"]?.ToString() ?? ""}
                };
            }

            // 2b. Add To Step ID (from Transition or Action rows)
            var toStepRow = group.FirstOrDefault(r =>
                r.ContainsKey("To Step ID") &&
                r["To Step ID"] != null &&
                r["To Step ID"] != DBNull.Value &&
                !string.IsNullOrEmpty(r["To Step ID"].ToString()));
            
            if (toStepRow != null)
            {
                row["To Step ID|To Step ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "To Step ID"},
                    {"Value", toStepRow["To Step ID"]?.ToString() ?? ""}
                };
            }

            // 2c. Add Workflow Model ID (from first row in group)
            if (firstInGroup.ContainsKey("Workflow Model ID"))
            {
                row["Workflow Model ID|Workflow Model ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "Workflow Model ID"},
                    {"Value", firstInGroup["Workflow Model ID"]?.ToString() ?? ""}
                };
            }

            // 2d. Add Field ID (from Step row)
            var stepFieldRow = group.FirstOrDefault(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Step" &&
                r.ContainsKey("Field ID"));
            
            if (stepFieldRow != null && stepFieldRow["Field ID"] != null)
            {
                row["Field ID|Field ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "Field ID"},
                    {"Value", stepFieldRow["Field ID"]?.ToString() ?? ""}
                };
            }

            // 3. Add Step Name (Field Type = "Step")
            var stepRow = group.FirstOrDefault(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Step");
            if (stepRow != null)
            {
                var stepName = stepRow.ContainsKey("Field Name") && stepRow["Field Name"] != null
                    ? stepRow["Field Name"].ToString()
                    : "";
                var stepDescription = stepRow.ContainsKey("Field Description") && stepRow["Field Description"] != null
                    ? stepRow["Field Description"].ToString()
                    : "";
                
                row["Step|Step Name"] = new Dictionary<string, string>
                {
                    {"Column Name", "Step Name"},
                    {"Value", stepName}
                };

                if (!string.IsNullOrEmpty(stepDescription))
                {
                    row["Step Description|Description"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Description"},
                        {"Value", stepDescription}
                    };
                }

                // Add Step Order if available
                if (stepRow.ContainsKey("Step Order") && stepRow["Step Order"] != null)
                {
                    row["Step Order|Order"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Order"},
                        {"Value", stepRow["Step Order"].ToString()}
                    };
                }
            }

            // 4. Add Actions (comma-separated list)
            var actions = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Action")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(a => !string.IsNullOrEmpty(a))
                .Distinct()
                .ToList();
            
            row["Actions|Workflow Actions"] = new Dictionary<string, string>
            {
                {"Column Name", "Actions"},
                {"Value", string.Join(", ", actions)}
            };

            // 5. Add Participants (comma-separated list)
            var participants = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Participant")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct()
                .ToList();
            
            if (participants.Any())
            {
                row["Participants|People"] = new Dictionary<string, string>
                {
                    {"Column Name", "Participants"},
                    {"Value", string.Join(", ", participants)}
                };
            }

            // 6. Add Functions (comma-separated list)
            var functions = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Function")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(f => !string.IsNullOrEmpty(f))
                .Distinct()
                .ToList();
            
            if (functions.Any())
            {
                row["Functions|Duty Functions"] = new Dictionary<string, string>
                {
                    {"Column Name", "Functions"},
                    {"Value", string.Join(", ", functions)}
                };
            }

            // 7. Add Output Definitions (comma-separated list)
            var outputs = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Output Definition")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(o => !string.IsNullOrEmpty(o))
                .Distinct()
                .ToList();
            
            if (outputs.Any())
            {
                row["Output Definitions|Outputs"] = new Dictionary<string, string>
                {
                    {"Column Name", "Output Definitions"},
                    {"Value", string.Join(", ", outputs)}
                };
            }

            // 8. Add Workflow Rules with transitions
            var rules = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Rule")
                .Select(r => {
                    var ruleName = r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "";
                    var toStepId = r.ContainsKey("To Step ID") && r["To Step ID"] != null ? r["To Step ID"].ToString() : "";
                    return string.IsNullOrEmpty(ruleName)
                        ? ""
                        : string.IsNullOrEmpty(toStepId) ? ruleName : $"{ruleName} → Step {toStepId}";
                })
                .Where(r => !string.IsNullOrEmpty(r))
                .Distinct()
                .ToList();
            
            if (rules.Any())
            {
                row["Rules|Workflow Rules"] = new Dictionary<string, string>
                {
                    {"Column Name", "Rules"},
                    {"Value", string.Join(", ", rules)}
                };
            }

            // 9. Add Rule Values (if present)
            var ruleValues = new List<string>();
            for (int i = 1; i <= 3; i++)
            {
                var ruleValueColumn = $"Rule Value {i}";
                var rulesWithValues = group.Where(r =>
                    r.ContainsKey(ruleValueColumn) && r[ruleValueColumn] != null && !string.IsNullOrEmpty(r[ruleValueColumn].ToString()))
                    .ToList();
                
                foreach (var ruleRow in rulesWithValues)
                {
                    var ruleName = ruleRow.ContainsKey("Field Name") && ruleRow["Field Name"] != null
                        ? ruleRow["Field Name"].ToString()
                        : "";
                    var ruleValue = ruleRow[ruleValueColumn].ToString();
                    
                    if (!string.IsNullOrEmpty(ruleName) && !string.IsNullOrEmpty(ruleValue))
                    {
                        ruleValues.Add($"{ruleName}={ruleValue}");
                    }
                }
            }
            
            if (ruleValues.Any())
            {
                row["Rule Values|Values"] = new Dictionary<string, string>
                {
                    {"Column Name", "Rule Values"},
                    {"Value", string.Join(", ", ruleValues.Distinct())}
                };
            }

            outputData.Add(row);
        }

        return outputData;
    }

    protected List<Dictionary<string, object>> TransformWorkflowInstanceData(List<Dictionary<string, object>> workflowData)
    {
        if (workflowData == null || !workflowData.Any())
        {
            return new List<Dictionary<string, object>>();
        }

        // Check if the data has the expected structure for workflow instance transformation
        var firstRow = workflowData.First();
        
        if (!firstRow.ContainsKey("Field Type") || !firstRow.ContainsKey("Sequence"))
        {
            _logger.LogWarning("The workflow instance data does not contain the expected keys (Field Type, Sequence). Returning original data.");
            return workflowData;
        }

        // Group by Sequence to get one row per workflow instance step
        var groupedData = workflowData.GroupBy(row => row["Sequence"]);

        var outputData = new List<Dictionary<string, object>>();

        foreach (var group in groupedData)
        {
            var row = new Dictionary<string, object>();
            var firstInGroup = group.First();

            // 1. Add Sequence (step number - always first column)
            row["Sequence|Step Number"] = new Dictionary<string, string>
            {
                {"Column Name", "Sequence"},
                {"Value", firstInGroup["Sequence"]?.ToString() ?? ""}
            };

            // 2. Add Workflow Instance Step ID (Field Type = "Workflow Instance Step ID")
            var wfInstanceStepRow = group.FirstOrDefault(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Workflow Instance Step ID");
            if (wfInstanceStepRow != null)
            {
                var stepId = wfInstanceStepRow.ContainsKey("Workflow Instance Step ID")
                    ? wfInstanceStepRow["Workflow Instance Step ID"]?.ToString()
                    : wfInstanceStepRow.ContainsKey("Field ID")
                        ? wfInstanceStepRow["Field ID"]?.ToString()
                        : "";
                var stepName = wfInstanceStepRow.ContainsKey("Attribute Name") && wfInstanceStepRow["Attribute Name"] != null
                    ? wfInstanceStepRow["Attribute Name"].ToString()
                    : "";
                var stepDescription = wfInstanceStepRow.ContainsKey("Long Text Value") && wfInstanceStepRow["Long Text Value"] != null
                    ? wfInstanceStepRow["Long Text Value"].ToString()
                    : "";
                
                row["Workflow Instance Step ID|Instance Step ID"] = new Dictionary<string, string>
                {
                    {"Column Name", "Workflow Instance Step ID"},
                    {"Value", stepId}
                };
                
                if (!string.IsNullOrEmpty(stepName))
                {
                    row["Step Name|Name"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Name"},
                        {"Value", stepName}
                    };
                }
                
                if (!string.IsNullOrEmpty(stepDescription))
                {
                    row["Step Description|Description"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Description"},
                        {"Value", stepDescription}
                    };
                }
                
                // Add Step Order if available
                if (wfInstanceStepRow.ContainsKey("Step Order") && wfInstanceStepRow["Step Order"] != null)
                {
                    row["Step Order|Order"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Order"},
                        {"Value", wfInstanceStepRow["Step Order"].ToString()}
                    };
                }
            }

            // 2a. Add Workflow Model Step ID (Field Type = "Workflow Model Step ID")
            var wfModelStepRow = group.FirstOrDefault(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Workflow Model Step ID");
            if (wfModelStepRow != null)
            {
                var modelStepId = wfModelStepRow.ContainsKey("Field ID") && wfModelStepRow["Field ID"] != null
                    ? wfModelStepRow["Field ID"].ToString()
                    : "";
                
                if (!string.IsNullOrEmpty(modelStepId))
                {
                    row["Workflow Model Step ID|Model Step ID"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Workflow Model Step ID"},
                        {"Value", modelStepId}
                    };
                }
                
                // Add Step Order from model step if not already added
                if (!row.ContainsKey("Step Order|Order") && wfModelStepRow.ContainsKey("Step Order") && wfModelStepRow["Step Order"] != null)
                {
                    row["Step Order|Order"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Order"},
                        {"Value", wfModelStepRow["Step Order"].ToString()}
                    };
                }
            }

            // 3. Add Step Status (Field Type = "Step Status")
            var statusRow = group.FirstOrDefault(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Step Status");
            if (statusRow != null)
            {
                var statusName = statusRow.ContainsKey("Attribute Name") && statusRow["Attribute Name"] != null
                    ? statusRow["Attribute Name"].ToString()
                    : "";
                var statusDescription = statusRow.ContainsKey("Long Text Value") && statusRow["Long Text Value"] != null
                    ? statusRow["Long Text Value"].ToString()
                    : "";
                
                row["Step Status|Status"] = new Dictionary<string, string>
                {
                    {"Column Name", "Step Status"},
                    {"Value", statusName}
                };
                
                if (!string.IsNullOrEmpty(statusDescription))
                {
                    row["Step Status Description|Status Description"] = new Dictionary<string, string>
                    {
                        {"Column Name", "Step Status Description"},
                        {"Value", statusDescription}
                    };
                }
            }

            // 4. Add Date Values (Field Type = "Date Value")
            var dateRows = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Date Value" &&
                r.ContainsKey("Date Value") && r["Date Value"] != null && r["Date Value"] != DBNull.Value)
                .ToList();
            
            foreach (var dateRow in dateRows)
            {
                var fieldName = dateRow.ContainsKey("Field Name") ? dateRow["Field Name"]?.ToString() : "";
                if (!string.IsNullOrEmpty(fieldName))
                {
                    row[$"Date|{fieldName}"] = new Dictionary<string, string>
                    {
                        {"Column Name", fieldName},
                        {"Value", dateRow["Date Value"]?.ToString() ?? ""}
                    };
                }
            }

            // 5. Add Input Files (Field Type = "Input File")
            var inputFiles = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Input File")
                .Select(r => r.ContainsKey("Long Text Value") && r["Long Text Value"] != null ? r["Long Text Value"].ToString() : "")
                .Where(f => !string.IsNullOrEmpty(f))
                .Distinct()
                .ToList();
            
            if (inputFiles.Any())
            {
                row["Input Files|Files"] = new Dictionary<string, string>
                {
                    {"Column Name", "Input Files"},
                    {"Value", string.Join(", ", inputFiles)}
                };
            }

            // 6. Add Person Output Definitions (Field Type = "Person Output Definition")
            var personOutputDefs = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Person Output Definition")
                .Select(r => {
                    var person = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var output = r.ContainsKey("Attribute Name") ? r["Attribute Name"]?.ToString() : "";
                    return string.IsNullOrEmpty(person) || string.IsNullOrEmpty(output) ? "" : $"{person}: {output}";
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
            
            if (personOutputDefs.Any())
            {
                row["Person Output Definitions|Outputs"] = new Dictionary<string, string>
                {
                    {"Column Name", "Person Output Definitions"},
                    {"Value", string.Join(", ", personOutputDefs)}
                };
            }

            // 7. Add Function Output Definitions (Field Type = "Function Output Definition")
            var functionOutputDefs = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Function Output Definition")
                .Select(r => {
                    var function = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var output = r.ContainsKey("Attribute Name") ? r["Attribute Name"]?.ToString() : "";
                    return string.IsNullOrEmpty(function) || string.IsNullOrEmpty(output) ? "" : $"{function}: {output}";
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
            
            if (functionOutputDefs.Any())
            {
                row["Function Output Definitions|Outputs"] = new Dictionary<string, string>
                {
                    {"Column Name", "Function Output Definitions"},
                    {"Value", string.Join(", ", functionOutputDefs)}
                };
            }

            // 8. Add Participants (Field Type = "Participants")
            var participants = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Participants")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct()
                .ToList();
            
            if (participants.Any())
            {
                row["Participants|People"] = new Dictionary<string, string>
                {
                    {"Column Name", "Participants"},
                    {"Value", string.Join(", ", participants)}
                };
            }

            // 9. Add Person Output Files (Field Type = "Person Output File")
            var personOutputFiles = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Person Output File")
                .Select(r => {
                    var person = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var file = r.ContainsKey("Long Text Value") ? r["Long Text Value"]?.ToString() : "";
                    return string.IsNullOrEmpty(person) || string.IsNullOrEmpty(file) ? "" : $"{person}: {file}";
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
            
            if (personOutputFiles.Any())
            {
                row["Person Output Files|Files"] = new Dictionary<string, string>
                {
                    {"Column Name", "Person Output Files"},
                    {"Value", string.Join(", ", personOutputFiles)}
                };
            }

            // 10. Add Functions (Field Type = "Functions")
            var functions = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Functions")
                .Select(r => r.ContainsKey("Field Name") && r["Field Name"] != null ? r["Field Name"].ToString() : "")
                .Where(f => !string.IsNullOrEmpty(f))
                .Distinct()
                .ToList();
            
            if (functions.Any())
            {
                row["Functions|Duty Functions"] = new Dictionary<string, string>
                {
                    {"Column Name", "Functions"},
                    {"Value", string.Join(", ", functions)}
                };
            }

            // 11. Add Function Output Files (Field Type = "Function Output File")
            var functionOutputFiles = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Function Output File")
                .Select(r => {
                    var function = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var file = r.ContainsKey("Long Text Value") ? r["Long Text Value"]?.ToString() : "";
                    return string.IsNullOrEmpty(function) || string.IsNullOrEmpty(file) ? "" : $"{function}: {file}";
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
            
            if (functionOutputFiles.Any())
            {
                row["Function Output Files|Files"] = new Dictionary<string, string>
                {
                    {"Column Name", "Function Output Files"},
                    {"Value", string.Join(", ", functionOutputFiles)}
                };
            }

            // 12. Add Workflow Rules (Field Type = "Workflow Rule")
            var rules = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"]?.ToString() == "Workflow Rule")
                .Select(r => {
                    var ruleName = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var toStepId = r.ContainsKey("To Step ID") && r["To Step ID"] != null ? r["To Step ID"].ToString() : "";
                    return string.IsNullOrEmpty(ruleName) ? "" :
                           string.IsNullOrEmpty(toStepId) ? ruleName : $"{ruleName} → Step {toStepId}";
                })
                .Where(r => !string.IsNullOrEmpty(r))
                .Distinct()
                .ToList();
            
            if (rules.Any())
            {
                row["Workflow Rules|Rules"] = new Dictionary<string, string>
                {
                    {"Column Name", "Workflow Rules"},
                    {"Value", string.Join(", ", rules)}
                };
            }

            // 13. Add Rule Values (Field Type = "Rule Value 1", "Rule Value 2", "Rule Value 3")
            var ruleValues = group.Where(r =>
                r.ContainsKey("Field Type") && r["Field Type"] != null && r["Field Type"].ToString().StartsWith("Rule Value") &&
                r.ContainsKey("Rule Value") && r["Rule Value"] != null && r["Rule Value"] != DBNull.Value)
                .Select(r => {
                    var ruleName = r.ContainsKey("Field Name") ? r["Field Name"]?.ToString() : "";
                    var ruleValue = r["Rule Value"]?.ToString();
                    return string.IsNullOrEmpty(ruleName) || string.IsNullOrEmpty(ruleValue) ? "" : $"{ruleName}={ruleValue}";
                })
                .Where(s => !string.IsNullOrEmpty(s))
                .Distinct()
                .ToList();
            
            if (ruleValues.Any())
            {
                row["Rule Values|Values"] = new Dictionary<string, string>
                {
                    {"Column Name", "Rule Values"},
                    {"Value", string.Join(", ", ruleValues)}
                };
            }

            outputData.Add(row);
        }

        return outputData;
    }

     protected List<Dictionary<string, object>> ConvertIdFieldsToNumbers(List<Dictionary<string, object>> data)
    {
        // If there's only one row with a Message field, it's an error message - return empty array
        if (data.Count == 1 && data[0].ContainsKey("Message"))
        {
            return new List<Dictionary<string, object>>();
        }

        // Use IdFieldTypesProvider if available, otherwise fall back to hardcoded list
        if (_idFieldTypesProvider != null)
        {
            foreach (var row in data)
            {
                foreach (var key in row.Keys.ToList())
                {
                    // Handle direct field values
                    if (_idFieldTypesProvider.IsNumericField(key) && row[key] != null && row[key] != DBNull.Value)
                    {
                        if (long.TryParse(row[key].ToString(), out long numericValue))
                        {
                            row[key] = numericValue;
                        }
                    }

                    // Handle fields that are objects with Column Name and Value properties
                    if (row[key] is Dictionary<string, string> dict && dict.ContainsKey("Column Name") && dict.ContainsKey("Value"))
                    {
                        if (_idFieldTypesProvider.IsNumericField(dict["Column Name"]) && !string.IsNullOrEmpty(dict["Value"]))
                        {
                            if (long.TryParse(dict["Value"], out long numericValue))
                            {
                                dict["Value"] = numericValue.ToString();
                            }
                        }
                    }

                    // Handle nested objects
                    if (row[key] is Dictionary<string, object> nestedDict)
                    {
                        foreach (var nestedKey in nestedDict.Keys.ToList())
                        {
                            if (_idFieldTypesProvider.IsNumericField(nestedKey) && nestedDict[nestedKey] != null && nestedDict[nestedKey] != DBNull.Value)
                            {
                                if (long.TryParse(nestedDict[nestedKey].ToString(), out long numericValue))
                                {
                                    nestedDict[nestedKey] = numericValue;
                                }
                            }
                        }
                    }
                }
            }
        }
        else
        {
            // Fallback to legacy hardcoded list
            var idFields = new[] { "List ID", "Attribute ID", "Filter Group ID", "Name List Position", "List Position", "Attribute Name ID", "Attribute Value ID", "ID" };
            foreach (var row in data)
            {
                foreach (var key in row.Keys.ToList())
                {
                    // Handle direct field values
                    if (idFields.Contains(key) && row[key] != null && row[key] != DBNull.Value)
                    {
                        if (long.TryParse(row[key].ToString(), out long numericValue))
                        {
                            row[key] = numericValue;
                        }
                    }

                    // Handle fields that are objects with Column Name and Value properties
                    if (row[key] is Dictionary<string, string> dict && dict.ContainsKey("Column Name") && dict.ContainsKey("Value"))
                    {
                        if (idFields.Contains(dict["Column Name"]) && !string.IsNullOrEmpty(dict["Value"]))
                        {
                            if (long.TryParse(dict["Value"], out long numericValue))
                            {
                                dict["Value"] = numericValue.ToString();
                            }
                        }
                    }

                    // Handle nested objects
                    if (row[key] is Dictionary<string, object> nestedDict)
                    {
                        foreach (var idField in idFields)
                        {
                            if (nestedDict.ContainsKey(idField) && nestedDict[idField] != null && nestedDict[idField] != DBNull.Value)
                            {
                                if (long.TryParse(nestedDict[idField].ToString(), out long numericValue))
                                {
                                    nestedDict[idField] = numericValue;
                                }
                            }
                        }
                    }
                }
            }
        }
        return data;
    }

    protected Dictionary<string, string> ExtractTooltips(List<Dictionary<string, object>> data)
 {
     var tooltips = new Dictionary<string, string>();
     foreach (var row in data)
     {
         if (row.ContainsKey("Field Type") && row["Field Type"] != null && (row.ContainsKey("Form Field Name") || row.ContainsKey("Name")))
         {
             string fieldType = row["Field Type"].ToString();
             string name = row.ContainsKey("Form Field Name") && row["Form Field Name"] != null ? row["Form Field Name"].ToString() :
                          row.ContainsKey("Name") && row["Name"] != null ? row["Name"].ToString() : "";
             string units = row.ContainsKey("Units") && row["Units"] != null ? row["Units"].ToString() : "";
             string key = $"{fieldType}|{name}";
             string tooltip = string.IsNullOrEmpty(units) ? name : $"{name}";
            tooltips[key] = tooltip;
         }
     }

        tooltips["Document ID|Document identifier"] = "Document identifier";
        tooltips["File ID|File identifier"] = "File identifier";
        return tooltips;
 }

    protected async Task<IActionResult> ExecuteWithErrorHandlingAsync<T>(
        string operationName,
        Func<Task<T>> operation,
        Func<T, IActionResult> successHandler)
    {
        // Declare variables at method scope so all catch blocks can preserve database parameters
        string? transactionMessage = null;
        string? transactionStatus = null;
        
        try
        {
            var result = await operation();
            
            // For StoredProcedureResult, extract output parameters from database
            if (result is StoredProcedureResult spResult)
            {
                // Extract the ACTUAL values from the stored procedure output parameters
                transactionMessage = GetOutputParameterValue(spResult, "@message");
                transactionStatus = GetOutputParameterValue(spResult, "@transaction_status");
            }
            
            try
            {
                return successHandler(result);
            }
            catch (NullReferenceException ex)
            {
                _logger.LogError(ex, $"A null reference exception occurred while processing the result of {operationName}.");

                // Create response preserving original database parameters
                // Never overwrite the database parameters transactionMessage and transactionStatus
                var response = new Dictionary<string, object>();
                
                // NEVER override database messaging system parameters
                // Always preserve original values from stored procedure
                if (!string.IsNullOrEmpty(transactionMessage))
                {
                    response["transactionMessage"] = transactionMessage;
                }
                if (!string.IsNullOrEmpty(transactionStatus))
                {
                    response["transactionStatus"] = transactionStatus;
                }
                
                // Use separate application-level error messaging system
                response["applicationError"] = new Dictionary<string, object>
                {
                    ["errorType"] = "NullReferenceException",
                    ["errorMessage"] = "Data processing error occurred",
                    ["operationName"] = operationName,
                    ["timestamp"] = DateTime.UtcNow
                };
                
                return Ok(response);
            }
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, $"A SQL exception occurred while {operationName}.");
            
            // Create response preserving database parameters from stored procedure
            var response = new Dictionary<string, object>();
            
            // Preserve database output parameters - NEVER overwrite these
            if (!string.IsNullOrEmpty(transactionMessage))
            {
                response["transactionMessage"] = transactionMessage;
            }
            if (!string.IsNullOrEmpty(transactionStatus))
            {
                response["transactionStatus"] = transactionStatus;
            }
            
            // Application errors go in separate field
            response["applicationError"] = new Dictionary<string, object>
            {
                ["errorType"] = "SqlException",
                ["errorMessage"] = ex.Message,
                ["sqlErrorNumber"] = ex.Number,
                ["operationName"] = operationName,
                ["timestamp"] = DateTime.UtcNow
            };
            
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"An exception occurred while {operationName}.");
            
            // Create response preserving database parameters from stored procedure
            var response = new Dictionary<string, object>();
            
            // Preserve database output parameters - NEVER overwrite these
            if (!string.IsNullOrEmpty(transactionMessage))
            {
                response["transactionMessage"] = transactionMessage;
            }
            if (!string.IsNullOrEmpty(transactionStatus))
            {
                response["transactionStatus"] = transactionStatus;
            }
            
            // Application errors go in separate field
            response["applicationError"] = new Dictionary<string, object>
            {
                ["errorType"] = ex.GetType().Name,
                ["errorMessage"] = ex.Message,
                ["operationName"] = operationName,
                ["timestamp"] = DateTime.UtcNow
            };
            
            return Ok(response);
        }
    }
}
