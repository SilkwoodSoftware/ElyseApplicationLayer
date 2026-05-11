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

// Reads users containing a given string

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[Route("api/sid-by-username")]
[ApiController]
public class ReadSidByUsernameController : BaseStoredProcedureController
{
    public ReadSidByUsernameController(StoredProcedureService storedProcedureService, ILogger<ReadSidByUsernameController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string containsString)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving users by username like '{containsString}'",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@likestring", string.IsNullOrWhiteSpace(containsString) ? null : containsString }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_sid_by_username", inputParameters);
            },
            result =>
            {
                var userData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    userData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
