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

// Updates a record to authorise people list members to link tags to a tag group.
[Route("api/user/tag-group/permission/people-list")]
[ApiController]
public class UpdateTagGroupPermissionPeopleList : BaseStoredProcedureController
{
    public UpdateTagGroupPermissionPeopleList(StoredProcedureService storedProcedureService, ILogger<UpdateTagGroupPermissionPeopleList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagGroupPermissionPeopleListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag group permission people list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_groupid", request.tagGroupId ?? (object)DBNull.Value },
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value },
                    { "@newtag_groupid", request.newTagGroupId ?? (object)DBNull.Value },
                    { "@newpeoplelistid", request.newPeopleListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_tag_group_perm_plist", parameters);
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

public class UpdateTagGroupPermissionPeopleListRequest
{
    public long? tagGroupId { get; set; }
    public long? peopleListId { get; set; }
    public long? newTagGroupId { get; set; }
    public long? newPeopleListId { get; set; }
}
