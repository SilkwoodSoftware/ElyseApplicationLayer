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

// Deletes a file to general field name for user list record.
[Route("api/file-user-link")]
[ApiController]
public class DeleteFileUserLink : BaseStoredProcedureController
{
    public DeleteFileUserLink(StoredProcedureService storedProcedureService, ILogger<DeleteFileUserLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFileUserLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting file to user link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@sidid", request.userId ?? (object)DBNull.Value },
                    { "@genfield_nameid", request.generalFieldNameId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_file_user_link", parameters);
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

public class DeleteFileUserLinkRequest
{
    public long? fileId { get; set; }
    public long? userId { get; set; }
    public long? generalFieldNameId { get; set; }
}
