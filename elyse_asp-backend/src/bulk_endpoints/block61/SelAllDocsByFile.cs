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

// Selects document data according to a file ID.
[Route("api/all-docs-by-file")]
[ApiController]
public class SelAllDocsByFile : BaseStoredProcedureController
{
    public SelAllDocsByFile(StoredProcedureService storedProcedureService, ILogger<SelAllDocsByFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetAllDocsByFile([FromQuery] long? fileId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all documents by file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_docs_by_file", parameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfDocs = GetOutputParameterValue(result, "@numdocs");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");
                var tooltips = ExtractTooltips(documentData);

                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    documentData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfDocs,
                    outputFormId,
                    formName,
                    tooltips
                };

                return Ok(response);
            });
    }
}
