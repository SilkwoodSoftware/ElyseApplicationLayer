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

// Deletes individual browsing tree from the reading schema

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/individual-browsing-tree")]
[ApiController]
public class DeleteIndividualBrowsingTreeController : BaseStoredProcedureController
{
    public DeleteIndividualBrowsingTreeController(StoredProcedureService storedProcedureService, ILogger<DeleteIndividualBrowsingTreeController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteIndividualBrowsingTreeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"deleting individual browsing tree with ID {request.tagBrowsingTreeId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@tag_br_treeid", request.tagBrowsingTreeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_DEL_indiv_browsing_tree", inputParameters);
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

public class DeleteIndividualBrowsingTreeRequest
{
    public long? tagBrowsingTreeId { get; set; }
}
