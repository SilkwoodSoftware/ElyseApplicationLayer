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

// Selects all the records which authorise members of a function list to link to a tag browsing tree.
[Route("api/tag/browsing-tree/permission/function-list")]
[ApiController]
public class ReadTagBrowsingTreePermissionFunctionLists : BaseStoredProcedureController
{
    public ReadTagBrowsingTreePermissionFunctionLists(StoredProcedureService storedProcedureService, ILogger<ReadTagBrowsingTreePermissionFunctionLists> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading tag browsing tree permission function lists",
            async () =>
            {
                var parameters = new Dictionary<string, object>();

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_tag_br_tr_perm_flists", parameters);
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
