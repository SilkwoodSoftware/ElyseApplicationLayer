/*
 * Copyright 2026 Silkwood Software Pty. Ltd.
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

// Lists the release identifiers for all documents.
[Route("api/release-ids")]
[ApiController]
public class ReadAllReleaseIds : BaseStoredProcedureController
{
    public ReadAllReleaseIds(StoredProcedureService storedProcedureService, ILogger<ReadAllReleaseIds> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading all release ids",
            async () =>
            {
                var parameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_release_ids", parameters);
            },
            result =>
            {
                var data = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numDocs = GetOutputParameterValue(result, "@numdocs");
                var tooltips = ExtractTooltips(data);

                var response = new
                {
                    data,
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numDocs,
                    tooltips
                };

                return Ok(response);
            });
    }
}
