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

// Deletes a record from file_radio_button_list_names
[Route("api/file/radio-button/attribute")]
[ApiController]
public class DeleteFileRadioButtonAttribute : BaseStoredProcedureController
{
    public DeleteFileRadioButtonAttribute(StoredProcedureService storedProcedureService, ILogger<DeleteFileRadioButtonAttribute> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteFileRadioButtonAttributeRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting file radio button attribute",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@id_to_delete", request.fileRadioButtonAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_DEL_file_radiob_attr", parameters);
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

public class DeleteFileRadioButtonAttributeRequest
{
    public long? fileRadioButtonAttributeId { get; set; }
}
