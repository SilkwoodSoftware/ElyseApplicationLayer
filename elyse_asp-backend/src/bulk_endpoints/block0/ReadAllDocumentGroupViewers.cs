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

// Selects all document group view permissions.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/document-group/viewers")]
[ApiController]
public class ReadAllDocumentGroupViewers : BaseStoredProcedureController
{
    public ReadAllDocumentGroupViewers(StoredProcedureService storedProcedureService, ILogger<ReadAllDocumentGroupViewers> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all document group viewers",
            async () =>
            {
                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_all_doc_group_viewers", new Dictionary<string, object>());
            },
            result =>
            {
                var viewersData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    viewersData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows
                };

                return Ok(response);
            });
    }
}
