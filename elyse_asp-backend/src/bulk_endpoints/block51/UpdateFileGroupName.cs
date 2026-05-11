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

// Updates a file group record.
[Route("api/file-group/name")]
[ApiController]
public class UpdateFileGroupName : BaseStoredProcedureController
{
    public UpdateFileGroupName(StoredProcedureService storedProcedureService, ILogger<UpdateFileGroupName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileGroupNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file group name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.fileGroupId ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@attribute_name", request.AttributeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_file_group_name", parameters);
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

public class UpdateFileGroupNameRequest
{
    public long? fileGroupId { get; set; }
    public string mnemonic { get; set; }
    public string AttributeName { get; set; }
    public string description { get; set; }
}
