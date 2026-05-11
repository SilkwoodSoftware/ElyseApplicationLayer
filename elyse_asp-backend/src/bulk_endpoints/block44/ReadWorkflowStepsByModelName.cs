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

// Selects all the workflow table nodes for a given workflow model ID.
[Route("api/workflow/steps/model/name")]
[ApiController]
public class ReadWorkflowStepsByModelName : BaseStoredProcedureController
{
    public ReadWorkflowStepsByModelName(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowStepsByModelName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? workflowModelId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow steps by model name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@workflow_model_id", workflowModelId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_steps_by_model_name", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numSteps = GetOutputParameterValue(result, "@num_steps");
                var numRecords = GetOutputParameterValue(result, "@num_records");

                // Get the workflow data from the first result set
                var workflowData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                
                // Transform the workflow model data from denormalized to normalized format
                var transformedData = TransformWorkflowModelData(workflowData);

                // Replace the first result set with the transformed data
                var resultSets = new List<List<Dictionary<string, object>>> { transformedData };
                if (result.ResultSets.Count > 1)
                {
                    resultSets.AddRange(result.ResultSets.Skip(1));
                }

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numSteps,
                    numRecords,
                    ResultSets = resultSets
                };

                return Ok(response);
            });
    }
}
