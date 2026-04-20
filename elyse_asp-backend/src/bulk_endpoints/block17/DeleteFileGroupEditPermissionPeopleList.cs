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

// Deletes a record for file group to people list link for file edit permission.
[Route("api/file-group/edit-permission/people-list")]
[ApiController]
public class DeleteFileGroupEditPermissionPeopleList : BaseStoredProcedureController
{
    public DeleteFileGroupEditPermissionPeopleList(StoredProcedureService storedProcedureService, ILogger<DeleteFileGroupEditPermissionPeopleList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFileGroupEditPermissionPeopleListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting file group edit permission people list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@filegroupid", request.fileGroupId ?? (object)DBNull.Value },
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_file_gp_ed_perm_people", parameters);
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

public class DeleteFileGroupEditPermissionPeopleListRequest
{
    public long? fileGroupId { get; set; }
    public long? peopleListId { get; set; }
}
