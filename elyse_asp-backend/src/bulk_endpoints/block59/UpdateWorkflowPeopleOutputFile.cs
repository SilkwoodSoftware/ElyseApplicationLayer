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

// Updates a record from workflow_instances.workflow_person_output_files.
[Route("api/workflow/people/output-file")]
[ApiController]
public class UpdateWorkflowPeopleOutputFile : BaseStoredProcedureController
{
    public UpdateWorkflowPeopleOutputFile(StoredProcedureService storedProcedureService, ILogger<UpdateWorkflowPeopleOutputFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateWorkflowPeopleOutputFileRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating workflow people output file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@instance_step_id", request.instanceStepId ?? (object)DBNull.Value },
                    { "@new_fileid", request.newFileId ?? (object)DBNull.Value },
                    { "@new_instance_step_id", request.newInstanceStepId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reviewing.usp_UPD_wf_people_output_file", parameters);
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

public class UpdateWorkflowPeopleOutputFileRequest
{
    public long? fileId { get; set; }
    public long? instanceStepId { get; set; }
    public long? newFileId { get; set; }
    public long? newInstanceStepId { get; set; }
 
}
