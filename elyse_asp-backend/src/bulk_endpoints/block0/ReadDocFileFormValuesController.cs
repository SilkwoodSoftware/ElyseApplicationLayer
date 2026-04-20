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

// Lists all form fields and values for a given document and file pair.
//Either the document id or file id may be null, but not both.
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;
 using System.Web;

[Route("api/forms")]
[ApiController]
public class ReadDocFileFormValuesController : BaseStoredProcedureController
{
    public ReadDocFileFormValuesController(StoredProcedureService storedProcedureService, ILogger<ReadDocFileFormValuesController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

     [HttpGet("doc-file-form-values")]
     public async Task<IActionResult> GetDocFileFormValues([FromQuery] long? formId = null, [FromQuery] string? documentId = null, [FromQuery] long? fileId = null)
    {
        try
        {
            // Step 1: Get actual form field values (existing data)
            var valuesInputParameters = new Dictionary<string, object>
            {
                { "@formid", formId ?? (object)DBNull.Value },
                { "@documentid", documentId ?? (object)DBNull.Value},
                { "@fileid", fileId ?? (object)DBNull.Value },
            };

            var valuesResult = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_doc_file_form_values", valuesInputParameters);
            var formValuesData = valuesResult.ResultSets[0];
            
            // Extract metadata from the values query
            var transactionMessage = GetOutputParameterValue(valuesResult, "@message");
            var transactionStatus = GetOutputParameterValue(valuesResult, "@transaction_status");
            var numberOfRows = GetOutputParameterValue(valuesResult, "@numrows");
            var outputFormIdString = GetOutputParameterValue(valuesResult, "@outputformid")?.ToString();
            var formName = GetOutputParameterValue(valuesResult, "@formname");

            // Determine the formId to use for getting all form fields
            long? effectiveFormId = formId;
            if (!effectiveFormId.HasValue && !string.IsNullOrEmpty(outputFormIdString))
            {
                if (long.TryParse(outputFormIdString, out long parsedFormId))
                {
                    effectiveFormId = parsedFormId;
                }
            }
            
            // Step 2: Get all form field definitions
            List<Dictionary<string, object>> allFormFieldsData = new List<Dictionary<string, object>>();
            
            if (effectiveFormId.HasValue)
            {
                var fieldsInputParameters = new Dictionary<string, object>
                {
                    { "@formid", effectiveFormId.Value }
                };

                var fieldsResult = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_form_fields", fieldsInputParameters);
                allFormFieldsData = fieldsResult.ResultSets[0];
            }
            else
            {
                _logger.LogWarning("No form ID available to retrieve form field definitions.");
            }

            // Return raw data - let frontend handle all processing
            var response = new
            {
                formValuesData, // Raw values data
                allFormFieldsData, // Raw form field definitions  
                transactionMessage,
                transactionStatus,
                numberOfRows,
                outputFormId = effectiveFormId,
                formName,
                documentId,
                fileId
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving form data for {formId}, {DocId}, {fileId}.", formId, documentId, fileId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving form data for {formId}, {DocId}, {fileId}.", formId, documentId, fileId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
