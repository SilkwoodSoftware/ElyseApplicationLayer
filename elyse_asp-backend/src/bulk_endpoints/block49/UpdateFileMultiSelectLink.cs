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

// Updates a file to multi-select attribute link record.
[Route("api/file/multi-select/link")]
[ApiController]
public class UpdateFileMultiSelectLink : BaseStoredProcedureController
{
    public UpdateFileMultiSelectLink(StoredProcedureService storedProcedureService, ILogger<UpdateFileMultiSelectLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileMultiSelectLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file multi-select link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", request.fileId ?? (object)DBNull.Value },
                    { "@filemslistid", request.fileMultiSelectListId ?? (object)DBNull.Value },
                    { "@filemsattrid", request.fileMultiSelectAttributeId ?? (object)DBNull.Value },
                    { "@newfilemsattrid", request.NewFileMultiSelectAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_UPD_file_multi_select_link", parameters);
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

public class UpdateFileMultiSelectLinkRequest
{
    public long? fileId { get; set; }
    public long? fileMultiSelectListId { get; set; }
    public long? fileMultiSelectAttributeId { get; set; }
    public long? NewFileMultiSelectAttributeId { get; set; }
}
