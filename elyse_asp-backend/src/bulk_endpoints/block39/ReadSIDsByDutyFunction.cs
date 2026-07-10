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

// Lists the sid records for a given duty function from the duty function to sid links table.
[Route("api/sid/duty-function")]
[ApiController]
public class ReadSIDsByDutyFunction : BaseStoredProcedureController
{
    public ReadSIDsByDutyFunction(StoredProcedureService storedProcedureService, ILogger<ReadSIDsByDutyFunction> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] ReadSIDsByDutyFunctionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading SIDs by duty function",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@functionid", request.functionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_sids_by_duty_function", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}

public class ReadSIDsByDutyFunctionRequest
{
    public long? functionId { get; set; }
}
