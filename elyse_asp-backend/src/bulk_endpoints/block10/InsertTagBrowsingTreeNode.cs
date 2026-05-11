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
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Inserts a node into the tag browsing tree.
[Route("api/tag/browsing-tree/node")]
[ApiController]
public class InsertTagBrowsingTreeNode : BaseStoredProcedureController
{
    public InsertTagBrowsingTreeNode(StoredProcedureService storedProcedureService, ILogger<InsertTagBrowsingTreeNode> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertTagBrowsingTreeNodeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating tag browsing tree node",
            async () =>
            {
                // Convert 'On'/'Off' string to boolean for @invert_tag parameter
                bool? invertTagBool = null;
                if (!string.IsNullOrEmpty(request.invertTag))
                {
                    if (string.Equals(request.invertTag, "On", StringComparison.OrdinalIgnoreCase))
                    {
                        invertTagBool = true;
                    }
                    else if (string.Equals(request.invertTag, "Off", StringComparison.OrdinalIgnoreCase))
                    {
                        invertTagBool = false;
                    }
                }

                var parameters = new Dictionary<string, object>
                {
                    { "@tag_id", request.tagId ?? (object)DBNull.Value },
                    { "@tag_br_treeid", request.tagBrowsingTreeId ?? (object)DBNull.Value },
                    { "@parentid", request.parentId ?? (object)DBNull.Value },
                    { "@invert_tag", invertTagBool ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_INS_tag_browsing_tree_node", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newRecordId = GetOutputParameterValue(result, "@newrecordid");
                var newNode = GetOutputParameterValue(result, "@newnode");

                var response = new
                {
                    newRecordId,
                    newNode,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertTagBrowsingTreeNodeRequest
{
    public long? tagId { get; set; }
    public long? tagBrowsingTreeId { get; set; }
    public long? parentId { get; set; }
    public string invertTag { get; set; }
}
