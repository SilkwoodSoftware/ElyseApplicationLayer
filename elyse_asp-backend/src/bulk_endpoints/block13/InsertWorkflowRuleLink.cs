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

// Links a workflow rule to a workflow step transition edge.
[Route("api/workflow/rule/link")]
[ApiController]
public class InsertWorkflowRuleLink : BaseStoredProcedureController
{
    public InsertWorkflowRuleLink(StoredProcedureService storedProcedureService, ILogger<InsertWorkflowRuleLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertWorkflowRuleLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating workflow rule link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_rule_id", request.workflowRuleId ?? (object)DBNull.Value },
                    { "@step_transitionid", request.stepTransitionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_workflow_rule_link", parameters);
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

public class InsertWorkflowRuleLinkRequest
{
    public long? workflowRuleId { get; set; }
    public long? stepTransitionId { get; set; }
}
