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

// Selects all tag browsing tree details which the connected user has edit permission for.
[Route("api/tag/browsing-tree/edit-permission")]
[ApiController]
public class ReadBrowsingTreesWithEditPermission : BaseStoredProcedureController
{
    public ReadBrowsingTreesWithEditPermission(StoredProcedureService storedProcedureService, ILogger<ReadBrowsingTreesWithEditPermission> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading browsing trees with edit permission",
            async () =>
            {
                var parameters = new Dictionary<string, object>();

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_brsng_trees_wth_ed_prm", parameters);
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
