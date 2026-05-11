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

// Inserts a general field name.
[Route("api/general-field-name")]
[ApiController]
public class InsertGeneralFieldName : BaseStoredProcedureController
{
    public InsertGeneralFieldName(StoredProcedureService storedProcedureService, ILogger<InsertGeneralFieldName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertGeneralFieldNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating general field name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@generalfield_name", request.generalfieldName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_general_field_name", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newRecordId = GetOutputParameterValue(result, "@newrecordid");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    newRecordId
                };

                return Ok(response);
            });
    }
}

public class InsertGeneralFieldNameRequest
{
    public string? mnemonic { get; set; }
    public string? generalfieldName { get; set; }
    public string? description { get; set; }
    public int? listPosition { get; set; }
}