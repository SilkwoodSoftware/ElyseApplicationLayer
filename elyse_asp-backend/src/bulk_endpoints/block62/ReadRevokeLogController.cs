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

// Reads revoke log entries from the authorising schema

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/revoke-log")]
[ApiController]
public class ReadRevokeLogController : BaseStoredProcedureController
{
    public ReadRevokeLogController(StoredProcedureService storedProcedureService, ILogger<ReadRevokeLogController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving revoke log entries",
            async () => await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_revoke_log", new Dictionary<string, object>()),
            result =>
            {
                var revokeLogData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    revokeLogData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
