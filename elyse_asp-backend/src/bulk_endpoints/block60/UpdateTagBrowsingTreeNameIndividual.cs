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

// Updates the tag browsing tree name for the tag browsing tree linked to the connected user.
[Route("api/tag/browsing-tree/name/individual")]
[ApiController]
public class UpdateTagBrowsingTreeNameIndividual : BaseStoredProcedureController
{
    public UpdateTagBrowsingTreeNameIndividual(StoredProcedureService storedProcedureService, ILogger<UpdateTagBrowsingTreeNameIndividual> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateTagBrowsingTreeNameIndividualRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating tag browsing tree name individual",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_br_treeid", request.tagBrowsingTreeId ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@browsing_tree_name", request.browsingTreeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_UPD_tag_br_tree_nm_indiv", parameters);
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

public class UpdateTagBrowsingTreeNameIndividualRequest
{
    public long? tagBrowsingTreeId { get; set; }
    public string mnemonic { get; set; }
    public string browsingTreeName { get; set; }
    public string description { get; set; }
    public int? listPosition { get; set; }
}
