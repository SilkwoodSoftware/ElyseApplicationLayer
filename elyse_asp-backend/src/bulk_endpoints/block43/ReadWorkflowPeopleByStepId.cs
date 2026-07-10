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

// Outputs workflow participants and associated data for a given instance step ID.
[Route("api/workflow/people/step")]
[ApiController]
public class ReadWorkflowPeopleByStepId : BaseStoredProcedureController
{
    public ReadWorkflowPeopleByStepId(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowPeopleByStepId> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? instanceStepId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow people by step ID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@instance_step_id", instanceStepId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_people_by_step_id", parameters);
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
