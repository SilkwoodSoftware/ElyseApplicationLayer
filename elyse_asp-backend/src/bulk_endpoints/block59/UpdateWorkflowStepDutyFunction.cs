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

// Updates a record from workflow_instances.workfow_step_duty_functions.
[Route("api/workflow/step/duty-function")]
[ApiController]
public class UpdateWorkflowStepDutyFunction : BaseStoredProcedureController
{
    public UpdateWorkflowStepDutyFunction(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowStepDutyFunction> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowStepDutyFunctionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow step duty function",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@instance_step_id", request.instanceStepId ?? (object)DBNull.Value },
                    { "@functionid", request.functionId ?? (object)DBNull.Value },
                    { "@outputid", request.outputId ?? (object)DBNull.Value },
                    { "@new_instance_step_id", request.newInstanceStepId ?? (object)DBNull.Value },
                    { "@new_functionid", request.newFunctionId ?? (object)DBNull.Value },
                    { "@new_outputid", request.newOutputId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_wf_step_duty_funct", parameters);
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

public class UpdateWorkflowStepDutyFunctionRequest
{
    public long? instanceStepId { get; set; }
    public long? functionId { get; set; }
    public long? outputId { get; set; }
    public long? newInstanceStepId { get; set; }
    public long? newFunctionId { get; set; }
    public long? newOutputId { get; set; }
}
