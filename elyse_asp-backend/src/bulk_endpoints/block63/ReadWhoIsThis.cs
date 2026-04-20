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

// Returns the username of the currently authenticated user.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/who-is-this")]
[ApiController]
public class ReadWhoIsThis : BaseStoredProcedureController
{
    public ReadWhoIsThis(StoredProcedureService storedProcedureService, ILogger<ReadWhoIsThis> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving current user information",
            async () => await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_whoisthis", new Dictionary<string, object>()),
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var username = GetOutputParameterValue(result, "@username");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    username
                };

                return Ok(response);
            });
    }
}
