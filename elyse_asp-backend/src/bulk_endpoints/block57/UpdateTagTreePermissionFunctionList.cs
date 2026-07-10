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

// Updates a record to authorise function list members to edit a tag tree.
[Route("api/tag-tree/permission/function-list")]
[ApiController]
public class UpdateTagTreePermissionFunctionList : BaseStoredProcedureController
{
    public UpdateTagTreePermissionFunctionList(StoredProcedureService storedProcedureService, ILogger<UpdateTagTreePermissionFunctionList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagTreePermissionFunctionListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag tree permission function list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_treeid", request.tagTreeId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value },
                    { "@newtag_treeid", request.newTagTreeId ?? (object)DBNull.Value },
                    { "@newfunctionlistid", request.newFunctionListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_tag_tree_perm_flist", parameters);
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

public class UpdateTagTreePermissionFunctionListRequest
{
    public long? tagTreeId { get; set; }
    public long? functionListId { get; set; }
    public long? newTagTreeId { get; set; }
    public long? newFunctionListId { get; set; }
}
