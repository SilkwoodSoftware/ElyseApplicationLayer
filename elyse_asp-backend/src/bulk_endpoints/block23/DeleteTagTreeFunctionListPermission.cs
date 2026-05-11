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

// Deletes a tag tree to function list record to revoke authorisation to edit a tag tree.
[Route("api/tag-tree/permission/function-list")]
[ApiController]
public class DeleteTagTreeFunctionListPermission : BaseStoredProcedureController
{
    public DeleteTagTreeFunctionListPermission(StoredProcedureService storedProcedureService, ILogger<DeleteTagTreeFunctionListPermission> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteTagTreeFunctionListPermissionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting tag tree function list permission",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_treeid", request.tagTreeId ?? (object)DBNull.Value },
                    { "@functionlistid", request.functionListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_tag_tree_perm_flist", parameters);
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

public class DeleteTagTreeFunctionListPermissionRequest
{
    public long? tagTreeId { get; set; }
    public long? functionListId { get; set; }
}
