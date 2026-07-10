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

// Selects the data for all of the tag groups linked to a given tag.
[Route("api/tag-group/tag")]
[ApiController]
public class ReadTagGroupsByTag : BaseStoredProcedureController
{
    public ReadTagGroupsByTag(StoredProcedureService storedProcedureService, ILogger<ReadTagGroupsByTag> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? tagId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading tag groups by tag",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_id", tagId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_tag_groups_by_tag", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
