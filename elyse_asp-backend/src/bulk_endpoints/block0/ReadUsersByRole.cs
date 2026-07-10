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

// Select all users for a given role (not including authorisers).

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/user/role")]
[ApiController]
public class ReadUsersByRole : BaseStoredProcedureController
{
    public ReadUsersByRole(StoredProcedureService storedProcedureService, ILogger<ReadUsersByRole> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string roleName)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving users for role {roleName}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@rolename", roleName }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_SEL_users_by_role", inputParameters);
            },
            result =>
            {
                var usersData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    usersData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
