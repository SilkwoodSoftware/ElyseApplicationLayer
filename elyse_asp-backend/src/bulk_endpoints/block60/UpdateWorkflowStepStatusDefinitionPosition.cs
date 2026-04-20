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

// Updates the list position for a step status definition name.
[Route("api/workflow/step-status/position")]
[ApiController]
public class UpdateWorkflowStepStatusDefinitionPosition : BaseStoredProcedureController
{
    public UpdateWorkflowStepStatusDefinitionPosition(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowStepStatusDefinitionPosition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowStepStatusDefinitionPositionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow step status definition position",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.stepStatusDefinitionId ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_wf_step_status_def_psn", parameters);
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

public class UpdateWorkflowStepStatusDefinitionPositionRequest
{
    public long? stepStatusDefinitionId { get; set; }
    public int? listPosition { get; set; }
}
