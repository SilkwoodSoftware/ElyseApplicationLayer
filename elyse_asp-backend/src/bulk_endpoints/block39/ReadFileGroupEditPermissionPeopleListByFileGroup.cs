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

// Selects people lists from records of file group to people list edit permission for a given file group.
[Route("api/people-list/file-group/file/edit-permission")]
[ApiController]
public class ReadFileGroupEditPermissionPeopleListByFileGroup : BaseStoredProcedureController
{
    public ReadFileGroupEditPermissionPeopleListByFileGroup(StoredProcedureService storedProcedureService, ILogger<ReadFileGroupEditPermissionPeopleListByFileGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] ReadFileGroupEditPermissionPeopleListByFileGroupRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading file group edit permission people list by file group",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@filegroupid", request.fileGroupId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_SEL_fgeppl_by_file_group", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}

public class ReadFileGroupEditPermissionPeopleListByFileGroupRequest
{
    public long? fileGroupId { get; set; }
}
