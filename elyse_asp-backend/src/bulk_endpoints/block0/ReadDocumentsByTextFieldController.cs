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

//Selects document metadata for a text field search. 
// Applies a filter group.
// Also retrieves the metadata for files linked to the document id
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/document")]
[ApiController]
public class ReadDocumentsByTextFieldController : BaseStoredProcedureController
{
    public ReadDocumentsByTextFieldController(StoredProcedureService storedProcedureService, ILogger<ReadDocumentsByTextFieldController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("docs-by-text-field")]
    public async Task<IActionResult> GetDocumentsByTextField(string likeString, long? doctextnameid = null,  long? filterGroupId = null, long? formId = null)
    {
        try
        {
             var inputParameters = new Dictionary<string, object>
            {
                { "@doctextnameid", doctextnameid ?? (object)DBNull.Value},
                { "@likestring", likeString },
                { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                { "@formid", formId ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_by_text_field", inputParameters);
            var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();           
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfRecords = GetOutputParameterValue(result, "@numrecords");
            var numberOfDocs = GetOutputParameterValue(result, "@numdocs");
            var tooltips = ExtractTooltips(documentData);     

            var transformedData = TransformDocDataExFiles(documentData);

            var response = new
            {
                documentData = transformedData,
                transactionMessage,
                transactionStatus,
                numberOfRecords,
                numberOfDocs,
                tooltips
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving documents by text field.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving documents by text field.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }  
}
