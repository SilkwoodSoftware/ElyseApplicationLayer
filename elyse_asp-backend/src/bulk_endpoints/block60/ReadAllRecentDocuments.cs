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
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Selects all documents created within the specified number of minutes.
[Route("api/recent-documents")]
[ApiController]
public class ReadAllRecentDocuments : BaseStoredProcedureController
{
    public ReadAllRecentDocuments(StoredProcedureService storedProcedureService, ILogger<ReadAllRecentDocuments> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetRecentDocuments([FromQuery] int? minutes, [FromQuery] long? formId = null) 
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving recent documents",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@minutes", minutes  },
                    { "@formid", formId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_recent_documents", parameters);
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

                var transformedData = TransformDocDataExFiles(documentData);

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
