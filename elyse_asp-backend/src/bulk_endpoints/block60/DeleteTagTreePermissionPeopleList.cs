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

// Deletes a tag link permissions record to revoke authorisation for members of a people list to link tags to a tag group 
[Route("api/tag-tree/permission/people-list")]
[ApiController]
public class DeleteTagTreePermissionPeopleList : BaseStoredProcedureController
{
    public DeleteTagTreePermissionPeopleList(StoredProcedureService storedProcedureService, ILogger<DeleteTagTreePermissionPeopleList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteTagTreePermissionPeopleListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting tag tree permission people list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_treeid", request.tagTreeId ?? (object)DBNull.Value },
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_tag_tree_perm_plist", parameters);
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

public class DeleteTagTreePermissionPeopleListRequest
{
    public long? tagTreeId { get; set; }
    public long? peopleListId { get; set; }
}
