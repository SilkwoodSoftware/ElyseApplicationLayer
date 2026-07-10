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

// Retrieves file IDs and data which are linked to the given document ID and filtered by filter group.
// Outputs data according to the given form ID.
// If no filter group or form id is supplied then the default is used.
[Route("api/files/document")]
[ApiController]
public class ReadFilesForOneDocument : BaseStoredProcedureController
{
    public ReadFilesForOneDocument(StoredProcedureService storedProcedureService, ILogger<ReadFilesForOneDocument> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string? documentId = null, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading files for one document",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_files_for_one_document", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numFiles = GetOutputParameterValue(result, "@numfiles");

                var fileData = result.ResultSets[0];
                var tooltips = ExtractTooltips(fileData);
                var transformedFilesData = TransformFilesData(fileData);                

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numFiles,
                    tooltips,
                    fileData = transformedFilesData,
                };

                return Ok(response);
            });
    }
}
