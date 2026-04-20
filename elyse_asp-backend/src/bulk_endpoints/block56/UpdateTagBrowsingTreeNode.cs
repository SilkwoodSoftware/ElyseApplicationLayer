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

// Updates the position of a browsing tree node.
[Route("api/tag/browsing-tree/node")]
[ApiController]
public class UpdateTagBrowsingTreeNode : BaseStoredProcedureController
{
    public UpdateTagBrowsingTreeNode(StoredProcedureService storedProcedureService, ILogger<UpdateTagBrowsingTreeNode> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagBrowsingTreeNodeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag browsing tree node",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_br_tree_node_id", request.tagBrowsingTreeNodeId ?? (object)DBNull.Value },
                    { "@new_parentid", request.newParentId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_UPD_tag_browsing_tree_node", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newNode = GetOutputParameterValue(result, "@newnode");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    newNode
                };

                return Ok(response);
            });
    }
}

public class UpdateTagBrowsingTreeNodeRequest
{
    public long? tagBrowsingTreeNodeId { get; set; }
    public long? newParentId { get; set; }
}
