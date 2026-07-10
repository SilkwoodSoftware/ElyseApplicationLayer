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

// Updates a file multi-select attribute list.
[Route("api/file-multi-select-attribute/list")]
[ApiController]
public class UpdateFileMultiSelectAttributeList : BaseStoredProcedureController
{
    public UpdateFileMultiSelectAttributeList(StoredProcedureService storedProcedureService, ILogger<UpdateFileMultiSelectAttributeList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileMultiSelectAttributeListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file multi-select attribute list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.fileMultiSelectAttributeId ?? (object)DBNull.Value },
                    { "@filemslistid", request.fileMultiSelectListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_file_ms_attr_list", parameters);
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

public class UpdateFileMultiSelectAttributeListRequest
{
    public long? fileMultiSelectAttributeId { get; set; }
    public int? fileMultiSelectListId { get; set; }
}