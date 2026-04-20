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
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// Inserts a record into file_attr.file_radio_button_list_names
[Route("api/file/radio-button/list")]
[ApiController]
public class InsertFileRadioButtonList : BaseStoredProcedureController
{
    public InsertFileRadioButtonList(StoredProcedureService storedProcedureService, ILogger<InsertFileRadioButtonList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertFileRadioButtonListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting file radio button list",
            async () =>
            {
                // Convert 'Restricted'/'Not-Restricted' string to boolean for @restricted parameter
                bool? restrictedBool = null;
                if (!string.IsNullOrEmpty(request.restricted))
                {
                    if (string.Equals(request.restricted, "Restricted", StringComparison.OrdinalIgnoreCase))
                    {
                        restrictedBool = true;
                    }
                    else if (string.Equals(request.restricted, "Not-Restricted", StringComparison.OrdinalIgnoreCase))
                    {
                        restrictedBool = false;
                    }
                }

                var parameters = new Dictionary<string, object>
                {
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@attribute_name", request.AttributeName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value },
                    { "@restricted", restrictedBool ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_file_radiob_list", parameters);
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

public class InsertFileRadioButtonListRequest
{
    public string? mnemonic { get; set; }
    public string? AttributeName { get; set; }
    public string? description { get; set; }
    public int? listPosition { get; set; }
    public string restricted { get; set; }
}
