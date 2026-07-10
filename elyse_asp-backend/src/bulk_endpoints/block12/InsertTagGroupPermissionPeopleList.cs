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

// Creates a new record to authorise people list members to link tags to a tag group.
[Route("api/user/tag-group/permission/people-list")]
[ApiController]
public class InsertTagGroupPermissionPeopleList : BaseStoredProcedureController
{
    public InsertTagGroupPermissionPeopleList(StoredProcedureService storedProcedureService, ILogger<InsertTagGroupPermissionPeopleList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertTagGroupPermissionPeopleListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating tag group permission people list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_groupid", request.tagGroupId ?? (object)DBNull.Value },
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_tag_group_perm_plist", parameters);
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

public class InsertTagGroupPermissionPeopleListRequest
{
    public long? tagGroupId { get; set; }
    public long? peopleListId { get; set; }
}
