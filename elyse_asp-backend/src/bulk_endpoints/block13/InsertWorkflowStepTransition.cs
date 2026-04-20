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

// Inserts a new record into the edge table for workflow step transitions.
[Route("api/workflow/step/transition")]
[ApiController]
public class InsertWorkflowStepTransition : BaseStoredProcedureController
{
    public InsertWorkflowStepTransition(StoredProcedureService storedProcedureService, ILogger<InsertWorkflowStepTransition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertWorkflowStepTransitionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating workflow step transition",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_actionid", request.workflowActionId ?? (object)DBNull.Value },
                    { "@steptransition_mnem", request.stepTransitionMnemonic ?? (object)DBNull.Value },
                    { "@steptransition_name", request.stepTransitionName ?? (object)DBNull.Value },
                    { "@steptransition_descr", request.stepTransitionDescription ?? (object)DBNull.Value },
                    { "@from_step_id", request.fromStepId ?? (object)DBNull.Value },
                    { "@to_step_id", request.toStepId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_workflow_step_transn", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newRecordId = GetOutputParameterValue(result, "@newrecordid");

                var response = new
                {
                    newRecordId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertWorkflowStepTransitionRequest
{
    public long? workflowActionId { get; set; }
    public string? stepTransitionMnemonic { get; set; }
    public string? stepTransitionName { get; set; }
    public string? stepTransitionDescription { get; set; }
    public long? fromStepId { get; set; }
    public long? toStepId { get; set; }
}
