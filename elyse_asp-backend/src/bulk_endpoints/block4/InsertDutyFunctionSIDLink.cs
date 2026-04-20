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

// Inserts a new record to link a duty function with a sid record.
[Route("api/duty-function/sid-link")]
[ApiController]
public class InsertDutyFunctionSIDLink : BaseStoredProcedureController
{
    public InsertDutyFunctionSIDLink(StoredProcedureService storedProcedureService, ILogger<InsertDutyFunctionSIDLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDutyFunctionSIDLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting duty function SID link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@functionid", request.functionId ?? (object)DBNull.Value },
                    { "@sidrecordid", request.userId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_duty_function_sid_link", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertDutyFunctionSIDLinkRequest
{
    public long? functionId { get; set; }
    public long? userId { get; set; }
    public string? inputNotes { get; set; }
}
