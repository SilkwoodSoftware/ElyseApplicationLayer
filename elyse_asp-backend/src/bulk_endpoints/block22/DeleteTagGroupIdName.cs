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

// Deletes a tag group identifier name record.
[Route("api/tag-group/name")]
[ApiController]
public class DeleteTagGroupIdName : BaseStoredProcedureController
{
    public DeleteTagGroupIdName(StoredProcedureService storedProcedureService, ILogger<DeleteTagGroupIdName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteTagGroupIdNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting tag group id name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@tag_groupid", request.tagGroupId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_DEL_tag_group_id_name", parameters);
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

public class DeleteTagGroupIdNameRequest
{
    public long? tagGroupId { get; set; }
}
