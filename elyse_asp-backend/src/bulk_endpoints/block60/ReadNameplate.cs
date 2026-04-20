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

// Retrieves the nameplate information.
[Route("api/nameplate")]
[ApiController]
public class ReadNameplate : BaseStoredProcedureController
{
    public ReadNameplate(StoredProcedureService storedProcedureService, ILogger<ReadNameplate> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetNameplate()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving nameplate information",
            async () =>
            {
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_nameplate", new Dictionary<string, object>());
            },
            result =>
            {
                var nameplateData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                
                var response = new
                {
                    nameplateData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
