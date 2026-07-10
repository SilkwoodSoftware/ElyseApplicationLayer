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

// Updates the data for a workflow model step.
[Route("api/workflow/step/definition")]
[ApiController]
public class UpdateWorkflowStepDefinition : BaseStoredProcedureController
{
    public UpdateWorkflowStepDefinition(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowStepDefinition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowStepDefinitionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow step definition",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@model_step_id", request.modelStepId ?? (object)DBNull.Value },
                    { "@workflow_model_id", request.workflowModelId ?? (object)DBNull.Value },
                    { "@model_stepmnem", request.modelStepMnemonic ?? (object)DBNull.Value },
                    { "@model_stepname", request.modelStepName ?? (object)DBNull.Value },
                    { "@model_stepdescr", request.modelStepDescription ?? (object)DBNull.Value },
                    { "@model_steporder", request.modelStepOrder ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_workflow_step_def", parameters);
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

public class UpdateWorkflowStepDefinitionRequest
{
    public long? modelStepId { get; set; }
    public long? workflowModelId { get; set; }
    public string modelStepMnemonic { get; set; }
    public string modelStepName { get; set; }
    public string modelStepDescription { get; set; }
    public int? modelStepOrder { get; set; }
}
