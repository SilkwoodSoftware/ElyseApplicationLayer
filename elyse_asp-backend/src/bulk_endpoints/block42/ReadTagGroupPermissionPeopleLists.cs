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

// Selects all the records which authorise members of a people list to link tags to a tag group.
[Route("api/user/tag-group/permission/people-list")]
[ApiController]
public class ReadTagGroupPermissionPeopleLists : BaseStoredProcedureController
{
    public ReadTagGroupPermissionPeopleLists(StoredProcedureService storedProcedureService, ILogger<ReadTagGroupPermissionPeopleLists> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading tag group permission people lists",
            async () =>
            {
                var parameters = new Dictionary<string, object>();

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_tag_group_perm_plists", parameters);
            },
            result =>
            {
                var resultSets = result.ResultSets;
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    ResultSets = resultSets,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
