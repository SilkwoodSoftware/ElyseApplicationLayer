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

// Deletes a record from workflow_instances.workflow_function_output_files.
[Route("api/workflow/function/output-file")]
[ApiController]
public class DeleteWorkflowFunctionOutputFile : BaseStoredProcedureController
{
    public DeleteWorkflowFunctionOutputFile(StoredProcedureService storedProcedureService, ILogger<DeleteWorkflowFunctionOutputFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteWorkflowFunctionOutputFileRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting workflow function output file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@instance_step_id", request.instanceStepId ?? (object)DBNull.Value },
                    { "@functionid", request.functionId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_wf_funct_output_file", parameters);
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

public class DeleteWorkflowFunctionOutputFileRequest
{
    public long? fileId { get; set; }
    public long? instanceStepId { get; set; }
    public long? functionId { get; set; }
}
