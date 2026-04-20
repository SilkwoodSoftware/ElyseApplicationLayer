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

// Inserts a record from workflow_instances.workflow_function_output_files to create a new record of output files for a given function and step.
[Route("api/workflow/function/output-file")]
[ApiController]
public class InsertWorkflowFunctionOutputFile : BaseStoredProcedureController
{
    public InsertWorkflowFunctionOutputFile(StoredProcedureService storedProcedureService, ILogger<InsertWorkflowFunctionOutputFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertWorkflowFunctionOutputFileRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating workflow function output file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@instance_step_id", request.instanceStepId ?? (object)DBNull.Value },
                    { "@functionid", request.functionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reviewing.usp_INS_wf_funct_output_file", parameters);
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

public class InsertWorkflowFunctionOutputFileRequest
{
    public long? fileId { get; set; }
    public long? instanceStepId { get; set; }
    public long? functionId { get; set; }
}
