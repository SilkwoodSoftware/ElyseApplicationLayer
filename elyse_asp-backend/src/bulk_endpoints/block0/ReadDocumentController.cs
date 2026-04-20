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

// Lists document metdata and also the file metadata of the key file linked to the document id
// as determined by the filter group. 

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/document")]
[ApiController]
public class ReadDocumentController : BaseStoredProcedureController
{
    public ReadDocumentController(StoredProcedureService storedProcedureService, ILogger<ReadDocumentController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("one-document-data")]
    public async Task<IActionResult> GetOneDocumentData([FromQuery] string documentId, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        try
        {
             var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", documentId },
                { "@filtergroupid", filterGroupId },
                { "@formid", formId }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_one_document_data", inputParameters);
            var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();           
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numRows = GetOutputParameterValue(result, "@numrows");
            var numRecords = GetOutputParameterValue(result, "@numrecords");
            var outputFormId = GetOutputParameterValue(result, "@outputformid");
            var formName = GetOutputParameterValue(result, "@formname");
            var outputFilterGroupId = GetOutputParameterValue(result, "@outputfiltergroupid");
            var filterGroupName = GetOutputParameterValue(result, "@filtergroupname");
            var tooltips = ExtractTooltips(documentData);
            var transformedData = TransformDocumentData(documentData);

            
            var response = new
            {
                documentData = transformedData,
                transactionMessage,
                transactionStatus,
                numRows,
                numRecords,
                outputFormId,
                formName,
                outputFilterGroupId,
                filterGroupName,
                tooltips
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while retrieving document data for document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while retrieving document data for document ID {documentId}.", documentId);
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
