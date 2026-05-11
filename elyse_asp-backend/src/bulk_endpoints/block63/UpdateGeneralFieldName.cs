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

// Updates a general field name.
[Route("api/general-field-name")]
[ApiController]
public class UpdateGeneralFieldName : BaseStoredProcedureController
{
    public UpdateGeneralFieldName(StoredProcedureService storedProcedureService, ILogger<UpdateGeneralFieldName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateGeneralFieldNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating general field name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.generalFieldNameId ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@generalfield_name", request.generalfieldName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@position", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_general_field_name", parameters);
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

public class UpdateGeneralFieldNameRequest
{
    public long? generalFieldNameId { get; set; }
    public string? mnemonic { get; set; }
    public string? generalfieldName { get; set; }
    public string? description { get; set; }
    public int? listPosition { get; set; }
}