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

// Updates a record from workflow_instances.workfow_instance_steps.
[Route("api/workflow/instance/step")]
[ApiController]
public class UpdateWorkflowInstanceStep : BaseStoredProcedureController
{
    public UpdateWorkflowInstanceStep(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowInstanceStep> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowInstanceStepRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow instance step",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.instanceStepId ?? (object)DBNull.Value },
                    { "@instanceid", request.workflowInstanceId ?? (object)DBNull.Value },
                    { "@model_step_id", request.modelStepId ?? (object)DBNull.Value },
                    { "@step_status_id", request.stepStatusId ?? (object)DBNull.Value },
                    { "@date1", request.date1 ?? (object)DBNull.Value },
                    { "@date2", request.date2 ?? (object)DBNull.Value },
                    { "@date3", request.date3 ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_workflow_instance_step", parameters);
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

public class UpdateWorkflowInstanceStepRequest
{
    public long? instanceStepId { get; set; }
    public long? workflowInstanceId { get; set; }
    public long? modelStepId { get; set; }
    public long? stepStatusId { get; set; }
    public System.DateTime? date1 { get; set; }
    public System.DateTime? date2 { get; set; }
    public System.DateTime? date3 { get; set; }
}
