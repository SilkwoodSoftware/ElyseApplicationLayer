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

// Selects the details of all trees which contain a given tag, and also returns the node ID and node string.
[Route("api/tag-tree/tag")]
[ApiController]
public class ReadTreesByTag : BaseStoredProcedureController
{
    public ReadTreesByTag(StoredProcedureService storedProcedureService, ILogger<ReadTreesByTag> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? tagId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading trees by tag",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_id", tagId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_trees_by_tag", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    resultSets = result.ResultSets
                };

                return Ok(response);
            });
    }
}
