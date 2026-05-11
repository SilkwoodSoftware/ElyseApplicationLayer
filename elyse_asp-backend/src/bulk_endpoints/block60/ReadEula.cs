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

// Retrieves the End User License Agreement (EULA) information.
[Route("api/eula")]
[ApiController]
public class ReadEula : BaseStoredProcedureController
{
    public ReadEula(StoredProcedureService storedProcedureService, ILogger<ReadEula> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetEula()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving EULA information",
            async () =>
            {
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_eula", new Dictionary<string, object>());
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var eulaText = GetOutputParameterValue(result, "@eula");
                
                var response = new
                {
                    eulaText,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}