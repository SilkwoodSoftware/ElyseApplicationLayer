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

// Updates a record from workflow_instances.workflow_step_input_files
[Route("api/workflow/input/step-file")]
[ApiController]
public class UpdateWorkflowInputStepFile : BaseStoredProcedureController
{
    public UpdateWorkflowInputStepFile(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowInputStepFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowInputStepFileRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow input step file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@input_step_id", request.inputStepId ?? (object)DBNull.Value },
                    { "@new_fileid", request.newFileId ?? (object)DBNull.Value },
                    { "@new_input_step_id", request.newInputStepId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_wf_input_step_file", parameters);
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

public class UpdateWorkflowInputStepFileRequest
{
    public long? fileId { get; set; }
    public long? inputStepId { get; set; }
    public long? newFileId { get; set; }
    public long? newInputStepId { get; set; }
}
