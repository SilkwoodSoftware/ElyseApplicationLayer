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

// Updates a workflow instance workflow action name.
[Route("api/workflow/action")]
[ApiController]
public class UpdateWorkflowAction : BaseStoredProcedureController
{
    public UpdateWorkflowAction(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowAction> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowActionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow action",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.workflowActionId ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@attribute_name", request.AttributeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_workflow_action", parameters);
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

public class UpdateWorkflowActionRequest
{
    public long? workflowActionId { get; set; }
    public string mnemonic { get; set; }
    public string AttributeName { get; set; }
    public string description { get; set; }
}
