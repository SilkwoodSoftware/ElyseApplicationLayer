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

// Inserts a record into workflow_instances.workflow_instance_definitions to create a new workflow instance.
[Route("api/workflow/instance")]
[ApiController]
public class InsertWorkflowInstanceDefinition : BaseStoredProcedureController
{
    public InsertWorkflowInstanceDefinition(StoredProcedureService storedProcedureService, ILogger<InsertWorkflowInstanceDefinition> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertWorkflowInstanceDefinitionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating workflow instance definition",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@workflow_model_id", request.workflowModelId ?? (object)DBNull.Value },
                    { "@present_step_id", request.presentStepId ?? (object)DBNull.Value },
                    { "@notes", request.notes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_workflow_instance_def", parameters);
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

public class InsertWorkflowInstanceDefinitionRequest
{
    public string? documentId { get; set; }
    public long? workflowModelId { get; set; }
    public long? presentStepId { get; set; }
    public string? notes { get; set; }
}
