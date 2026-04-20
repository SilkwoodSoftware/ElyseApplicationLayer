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

// Updates a record to authorise function list members to link tags to a tag group.
[Route("api/user/tag-group/permission/function-list")]
[ApiController]
public class UpdateTagGroupPermissionFunctionList : BaseStoredProcedureController
{
    public UpdateTagGroupPermissionFunctionList(StoredProcedureService storedProcedureService, ILogger<UpdateTagGroupPermissionFunctionList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagGroupPermissionFunctionListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag group permission function list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_groupid", request.tagGroupId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value },
                    { "@newtag_groupid", request.newTagGroupId ?? (object)DBNull.Value },
                    { "@newfunctionlistid", request.newFunctionListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_tag_group_perm_flist", parameters);
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

public class UpdateTagGroupPermissionFunctionListRequest
{
    public long? tagGroupId { get; set; }
    public long? functionListId { get; set; }
    public long? newTagGroupId { get; set; }
    public long? newFunctionListId { get; set; }
}
