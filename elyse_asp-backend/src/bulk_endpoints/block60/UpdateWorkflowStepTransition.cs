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

// Updates a record for a workflow model step transition ID.
[Route("api/workflow/step/transition")]
[ApiController]
public class UpdateWorkflowStepTransition : BaseStoredProcedureController
{
    public UpdateWorkflowStepTransition(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowStepTransition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowStepTransitionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow step transition",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@step_transitionid", request.stepTransitionId ?? (object)DBNull.Value },
                    { "@workflow_actionid", request.workflowActionId ?? (object)DBNull.Value },
                    { "@steptransition_mnem", request.stepTransitionMnemonic ?? (object)DBNull.Value },
                    { "@steptransition_name", request.stepTransitionName ?? (object)DBNull.Value },
                    { "@steptransition_descr", request.stepTransitionDescription ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_workflow_step_transn", parameters);
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

public class UpdateWorkflowStepTransitionRequest
{
    public long? stepTransitionId { get; set; }
    public long? workflowActionId { get; set; }
    public string stepTransitionMnemonic { get; set; }
    public string stepTransitionName { get; set; }
    public string stepTransitionDescription { get; set; }
}
