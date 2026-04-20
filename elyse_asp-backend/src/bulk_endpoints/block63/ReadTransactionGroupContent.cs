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

// Searches for transaction groups by content using a LIKE string pattern.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/transaction-groups")]
[ApiController]
public class ReadTransactionGroupContent : BaseStoredProcedureController
{
    public ReadTransactionGroupContent(StoredProcedureService storedProcedureService, ILogger<ReadTransactionGroupContent> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("contains")]
    public async Task<IActionResult> SearchByContent([FromQuery] string containsString)
    {
        return await ExecuteWithErrorHandlingAsync(
            "searching transaction groups by content",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@likestring", containsString ?? string.Empty }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_transaction_grp_cont", inputParameters);
            },
            result =>
            {
                var resultSets = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    resultSets,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}