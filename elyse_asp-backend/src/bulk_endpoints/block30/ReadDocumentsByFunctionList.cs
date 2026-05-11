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

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

// Selects metadata for documents linked to a given duty function list.
// Also returns metadata for the files linked to the returned documents.
// A filter group is applied.
[Route("api/documents/function-list/filtered")]
[ApiController]
public class ReadDocumentsByFunctionList : BaseStoredProcedureController
{
    public ReadDocumentsByFunctionList(StoredProcedureService storedProcedureService, ILogger<ReadDocumentsByFunctionList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? functionListId = null, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading documents by function list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@functionlistid", functionListId ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_by_function_list", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numRecords = GetOutputParameterValue(result, "@numrecords");
                var numDocs = GetOutputParameterValue(result, "@numdocs");

                var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocDataExFiles(documentData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numRecords,
                    numDocs,
                    tooltips,
                    resultSets = transformedData
                };

                return Ok(response);
            });
    }
}
