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

// Outputs workflow steps and associated data for a given person ID.
[Route("api/workflow/step/person")]
[ApiController]
public class ReadWorkflowStepsByPerson : BaseStoredProcedureController
{
    public ReadWorkflowStepsByPerson(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowStepsByPerson> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? personId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow steps by person",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@sidid", personId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_steps_by_person", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
