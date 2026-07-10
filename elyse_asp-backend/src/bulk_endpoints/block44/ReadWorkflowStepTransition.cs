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

// Selects the data for a given workflow model step transition ID.
[Route("api/workflow/step/transition")]
[ApiController]
public class ReadWorkflowStepTransition : BaseStoredProcedureController
{
    public ReadWorkflowStepTransition(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowStepTransition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? stepTransitionId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow step transition",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@step_transitionid", stepTransitionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_workflow_step_transn", parameters);
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
