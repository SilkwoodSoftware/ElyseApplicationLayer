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
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/workflow/rules")]
[ApiController]
public class ReadWorkflowRulesByModelStep : BaseStoredProcedureController
{
    public ReadWorkflowRulesByModelStep(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowRulesByModelStep> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("by-model-step")]
    public async Task<IActionResult> GetByModelStep([FromQuery] long workflowStepId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow rules by model step",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_step_id", workflowStepId }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_rules_by_model_step", parameters);
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
