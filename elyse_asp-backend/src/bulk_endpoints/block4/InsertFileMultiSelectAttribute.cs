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

// Inserts a new file multi-select attribute record.
[Route("api/file/multi-select/attribute")]
[ApiController]
public class InsertFileMultiSelectAttribute : BaseStoredProcedureController
{
    public InsertFileMultiSelectAttribute(StoredProcedureService storedProcedureService, ILogger<InsertFileMultiSelectAttribute> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertFileMultiSelectAttributeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting file multi-select attribute",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@attribute_name", request.AttributeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value },
                    { "@file_mslistid", request.fileMultiSelectListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_file_ms_attribute", parameters);
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

public class InsertFileMultiSelectAttributeRequest
{
    public string? mnemonic { get; set; }
    public string? AttributeName { get; set; }
    public string? description { get; set; }
    public int? listPosition { get; set; }
    public int? fileMultiSelectListId { get; set; }
}
