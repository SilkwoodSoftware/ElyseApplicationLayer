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

// Lists the duty functions for a given sid record id from the duty function to sid links table.
[Route("api/duty-function/sid-link")]
[ApiController]
public class ReadDutyFunctionsBySID : BaseStoredProcedureController
{
    public ReadDutyFunctionsBySID(StoredProcedureService storedProcedureService, ILogger<ReadDutyFunctionsBySID> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? userId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading duty functions by SID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@sidrecordid", userId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_duty_functions_by_sid", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    resultSets = result.ResultSets
                };

                return Ok(response);
            });
    }
}
