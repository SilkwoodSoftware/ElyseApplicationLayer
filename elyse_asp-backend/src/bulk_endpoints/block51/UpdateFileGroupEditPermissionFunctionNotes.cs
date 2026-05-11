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

// Updates the notes column of a file group function list edit permission record.
[Route("api/file-group/edit-permission/function-list/notes")]
[ApiController]
public class UpdateFileGroupEditPermissionFunctionNotes : BaseStoredProcedureController
{
    public UpdateFileGroupEditPermissionFunctionNotes(StoredProcedureService storedProcedureService, ILogger<UpdateFileGroupEditPermissionFunctionNotes> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileGroupEditPermissionFunctionNotesRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file group edit permission function notes",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@filegroupid", request.fileGroupId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_fl_gp_ed_prm_fct_notes", parameters);
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

public class UpdateFileGroupEditPermissionFunctionNotesRequest
{
    public long? fileGroupId { get; set; }
    public long? functionListId { get; set; }
    public string inputNotes { get; set; }
}
