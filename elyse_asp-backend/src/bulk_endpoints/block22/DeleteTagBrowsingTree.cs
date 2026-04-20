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

// Deletes a tag browsing tree, both the node tree and the tree name details.
[Route("api/tag/browsing-tree")]
[ApiController]
public class DeleteTagBrowsingTree : BaseStoredProcedureController
{
    public DeleteTagBrowsingTree(StoredProcedureService storedProcedureService, ILogger<DeleteTagBrowsingTree> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteTagBrowsingTreeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting tag browsing tree",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_br_treeid", request.tagBrowsingTreeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_tag_browsing_tree", parameters);
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

public class DeleteTagBrowsingTreeRequest
{
    public long? tagBrowsingTreeId { get; set; }
}
