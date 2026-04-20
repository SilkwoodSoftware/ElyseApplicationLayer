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

// Selects all of the tags for a given tag browsing tree ID.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/tag/browsing-tree/tags")]
[ApiController]
public class ReadBrowsingTreeById : BaseStoredProcedureController
{
    public ReadBrowsingTreeById(StoredProcedureService storedProcedureService, ILogger<ReadBrowsingTreeById> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long tagBrowsingTreeId)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving tags for browsing tree ID {tagBrowsingTreeId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@tag_br_treeid", tagBrowsingTreeId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_browsing_tree_by_id", inputParameters);
            },
            result =>
            {
                var tagsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    tagsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
