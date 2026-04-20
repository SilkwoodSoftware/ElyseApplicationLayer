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

// Links a user sid to a controller level file group to authorise the user.
[Route("api/user/controller/file-group")]
[ApiController]
public class AuthoriseControllerFileGroupUser : BaseStoredProcedureController
{
    public AuthoriseControllerFileGroupUser(StoredProcedureService storedProcedureService, ILogger<AuthoriseControllerFileGroupUser> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("authorise")]
    public async Task<IActionResult> Authorise([FromBody] AuthoriseControllerFileGroupUserRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "authorising controller file group user",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@contr_file_ed_grp_name_id", request.controllerFileEditGroupNameId ?? (object)DBNull.Value },
                    { "@user_sid_id", request.userId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_AUTHORISE_contr_fl_grp_usr", parameters);
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

public class AuthoriseControllerFileGroupUserRequest
{
    public long? controllerFileEditGroupNameId { get; set; }
    public long? userId { get; set; }
    public string? inputNotes { get; set; }
}
