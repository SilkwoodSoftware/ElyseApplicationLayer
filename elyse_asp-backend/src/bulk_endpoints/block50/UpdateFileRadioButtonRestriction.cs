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

// Updates the restricted flag for a file radio button list.
[Route("api/file/radio-button/list/restriction")]
[ApiController]
public class UpdateFileRadioButtonRestriction : BaseStoredProcedureController
{
    public UpdateFileRadioButtonRestriction(StoredProcedureService storedProcedureService, ILogger<UpdateFileRadioButtonRestriction> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileRadioButtonRestrictionRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file radio button restriction",
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
                    { "@recordid", request.fileRadioButtonListId ?? (object)DBNull.Value },
                    { "@restricted", restrictedBool ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_file_rb_restriction", parameters);
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

public class UpdateFileRadioButtonRestrictionRequest
{
    public long? fileRadioButtonListId { get; set; }
    public string restricted { get; set; }
}
