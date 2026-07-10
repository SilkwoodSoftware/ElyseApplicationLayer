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

// Authorises a user to view a restricted document group.
[Route("api/user/restricted-document-group")]
[ApiController]
public class AuthoriseDocGroupUser : BaseStoredProcedureController
{
    public AuthoriseDocGroupUser(StoredProcedureService storedProcedureService, ILogger<AuthoriseDocGroupUser> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("authorise")]
    public async Task<IActionResult> Authorise([FromBody] AuthoriseDocGroupUserRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "authorising document group viewer",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docgroupid", request.docGroupId ?? (object)DBNull.Value },
                    { "@user_sid_id", request.userId ?? (object)DBNull.Value },
                    { "@inputnotes", request.inputNotes ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_AUTHORISE_doc_group_viewer", parameters);
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

public class AuthoriseDocGroupUserRequest
{
    public long? docGroupId { get; set; }
    public long? userId { get; set; }
    public string? inputNotes { get; set; }
}
