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

// Updates the record notes for a user role link.
[Route("api/user/role/link/notes")]
[ApiController]
public class UpdateUserRoleLinkNotes : BaseStoredProcedureController
{
    public UpdateUserRoleLinkNotes(StoredProcedureService storedProcedureService, ILogger<UpdateUserRoleLinkNotes> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateUserRoleLinkNotesRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating user role link notes",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@rolename", request.roleName ?? (object)DBNull.Value },
                    { "@userid", request.userId ?? (object)DBNull.Value },
                    { "@recordnotes", request.recordNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_UPD_user_role_link_notes", parameters);
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

public class UpdateUserRoleLinkNotesRequest
{
    public string roleName { get; set; }
    public long? userId { get; set; }
    public string recordNotes { get; set; }
}
