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

// Replaces the tag at a given node in a tag tree.
[Route("api/tag-tree/tag")]
[ApiController]
public class UpdateTagTreeTag : BaseStoredProcedureController
{
    public UpdateTagTreeTag(StoredProcedureService storedProcedureService, ILogger<UpdateTagTreeTag> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagTreeTagRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag tree tag",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_tree_node_id", request.tagTreeNodeId ?? (object)DBNull.Value },
                    { "@new_tagid", request.newTagId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_tag_tree_tag", parameters);
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

public class UpdateTagTreeTagRequest
{
    public long? tagTreeNodeId { get; set; }
    public long? newTagId { get; set; }
}
