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

// Returns all of the workflow instance definitions and associated workflow model details for a given model ID.
[Route("api/workflow/instance/model")]
[ApiController]
public class ReadWorkflowInstanceDefinitionByModel : BaseStoredProcedureController
{
    public ReadWorkflowInstanceDefinitionByModel(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowInstanceDefinitionByModel> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? workflowModelId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow instance definition by model",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_model_id", workflowModelId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_inst_def_by_model", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
