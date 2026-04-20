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

// Reads user privileges from the authorising schema

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/privileges-by-user")]
[ApiController]
public class ReadPrivilegesByUserController : BaseStoredProcedureController
{
    public ReadPrivilegesByUserController(StoredProcedureService storedProcedureService, ILogger<ReadPrivilegesByUserController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long userId)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving privileges for user ID {userId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@userid", userId }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_privileges_by_user", inputParameters);
            },
            result =>
            {
                var privilegesData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    privilegesData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
