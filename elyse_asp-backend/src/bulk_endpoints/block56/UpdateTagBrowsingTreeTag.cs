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

// Replaces the tag at a given node in a tag browsing tree.
[Route("api/tag/browsing-tree/tag")]
[ApiController]
public class UpdateTagBrowsingTreeTag : BaseStoredProcedureController
{
    public UpdateTagBrowsingTreeTag(StoredProcedureService storedProcedureService, ILogger<UpdateTagBrowsingTreeTag> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagBrowsingTreeTagRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag browsing tree tag",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_br_tree_node_id", request.tagBrowsingTreeNodeId ?? (object)DBNull.Value },
                    { "@new_tagid", request.newTagId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_UPD_tag_br_tree_tag", parameters);
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

public class UpdateTagBrowsingTreeTagRequest
{
    public long? tagBrowsingTreeNodeId { get; set; }
    public long? newTagId { get; set; }
}
