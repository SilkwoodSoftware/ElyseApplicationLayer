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

// Updates a workflow rule to step transition link.
[Route("api/workflow/rule/link")]
[ApiController]
public class UpdateWorkflowRuleLink : BaseStoredProcedureController
{
    public UpdateWorkflowRuleLink(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowRuleLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowRuleLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow rule link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_rule_id", request.workflowRuleId ?? (object)DBNull.Value },
                    { "@step_transitionid", request.stepTransitionId ?? (object)DBNull.Value },
                    { "@new_workflow_rule_id", request.newWorkflowRuleId ?? (object)DBNull.Value },
                    { "@new_step_transitionid", request.newStepTransitionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_workflow_rule_link", parameters);
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

public class UpdateWorkflowRuleLinkRequest
{
    public long? workflowRuleId { get; set; }
    public long? stepTransitionId { get; set; }
    public long? newWorkflowRuleId { get; set; }
    public long? newStepTransitionId { get; set; }
}
