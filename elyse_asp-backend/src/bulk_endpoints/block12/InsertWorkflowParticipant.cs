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

// Inserts a record to create a workflow instance step to person link.
[Route("api/workflow/participant")]
[ApiController]
public class InsertWorkflowParticipant : BaseStoredProcedureController
{
    public InsertWorkflowParticipant(StoredProcedureService storedProcedureService, ILogger<InsertWorkflowParticipant> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertWorkflowParticipantRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating workflow participant",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@instance_step_id", request.instanceStepId ?? (object)DBNull.Value },
                    { "@sidid", request.personId ?? (object)DBNull.Value },
                    { "@outputid", request.outputId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_workflow_participant", parameters);
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

public class InsertWorkflowParticipantRequest
{
    public long? instanceStepId { get; set; }
    public long? personId { get; set; }
    public long? outputId { get; set; }
}
