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

// Lists file metdata of all the files linked to the document id.
// Does not apply a filter group. 

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/document")]
[ApiController]
public class ReadAllFilesForOneDocumentController : BaseStoredProcedureController
{
    public ReadAllFilesForOneDocumentController(StoredProcedureService storedProcedureService, ILogger<ReadAllFilesForOneDocumentController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("all-files-for-one-document")]
    public async Task<IActionResult> GetAllFilesOneDocument(string? documentId = null, long? filterGroupId = null, long? formId = null)
    {
        try
        {
             var inputParameters = new Dictionary<string, object>
            {
                { "@documentid", documentId ?? (object)DBNull.Value },
                { "@formid", formId ?? (object)DBNull.Value }
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_files_for_one_doc", inputParameters);
            var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();           
            var transactionMessage = GetOutputParameterValue(result, "@message");
            var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
            var numberOfFiles = GetOutputParameterValue(result, "@numfiles");  
            var tooltips = ExtractTooltips(documentData);

            var transformedData = TransformFilesData(documentData);

            var response = new
            {
                fileData = transformedData,
                transactionMessage,
                transactionStatus,
                numberOfFiles,
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
