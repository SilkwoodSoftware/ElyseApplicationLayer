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

// Selects the data for a given instance step ID.
[Route("api/workflow/step/step-data")]
[ApiController]
public class ReadWorkflowStepGetStepData : BaseStoredProcedureController
{
    public ReadWorkflowStepGetStepData(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowStepGetStepData> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? instanceStepId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow step data",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@instance_step_id", instanceStepId ?? (object)DBNull.Value }
                };

                var rawResult = await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_step_get_step_data", parameters);

                // Apply transformation to convert EAV format to columnar format
                if (rawResult.ResultSets != null && rawResult.ResultSets.Count > 0)
                {
                    var transformedData = TransformWorkflowInstanceData(rawResult.ResultSets[0]);
                    rawResult.ResultSets[0] = transformedData;
                }

                return rawResult;
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRecords = GetOutputParameterValue(result, "@num_records");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRecords,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
