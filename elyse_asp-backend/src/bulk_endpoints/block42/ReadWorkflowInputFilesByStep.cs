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

// Lists workflow instance input files for a given workflow instance step.
[Route("api/workflow/input/file/step")]
[ApiController]
public class ReadWorkflowInputFilesByStep : BaseStoredProcedureController
{
    public ReadWorkflowInputFilesByStep(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowInputFilesByStep> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? instanceStepId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow input files by step",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@instance_step_id", instanceStepId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_input_files_by_step", parameters);
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
