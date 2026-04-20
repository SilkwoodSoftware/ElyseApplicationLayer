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

// Creates a new tag tree name which is linked to the connected user.
[Route("api/tag/browsing-tree/name/individual")]
[ApiController]
public class InsertTagBrowsingTreeNameIndividual : BaseStoredProcedureController
{
    public InsertTagBrowsingTreeNameIndividual(StoredProcedureService storedProcedureService, ILogger<InsertTagBrowsingTreeNameIndividual> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertTagBrowsingTreeNameIndividualRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating tag browsing tree name individual",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@browsing_tree_name", request.browsingTreeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_INS_tag_br_tree_nm_indiv", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newRecordId = GetOutputParameterValue(result, "@newrecordid");

                var response = new
                {
                    newRecordId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertTagBrowsingTreeNameIndividualRequest
{
    public string mnemonic { get; set; }
    public string browsingTreeName { get; set; }
    public string description { get; set; }
    public int? listPosition { get; set; }
}
