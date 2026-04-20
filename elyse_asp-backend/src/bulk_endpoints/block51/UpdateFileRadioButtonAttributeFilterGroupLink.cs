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

// Updates a file radio button attribute to filter group link.
[Route("api/file/radio-button-attribute/filter-group/link")]
[ApiController]
public class UpdateFileRadioButtonAttributeFilterGroupLink : BaseStoredProcedureController
{
    public UpdateFileRadioButtonAttributeFilterGroupLink(StoredProcedureService storedProcedureService, ILogger<UpdateFileRadioButtonAttributeFilterGroupLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFileRadioButtonAttributeFilterGroupLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating file radio button attribute filter group link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@filtergroupid", request.filterGroupId ?? (object)DBNull.Value },
                    { "@file_radiobattrid", request.fileRadioButtonAttributeId ?? (object)DBNull.Value },
                    { "@newfile_radiobattrid", request.newFileRadioButtonAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_file_rb_attr_fg_link", parameters);
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

public class UpdateFileRadioButtonAttributeFilterGroupLinkRequest
{
    public long? filterGroupId { get; set; }
    public long? fileRadioButtonAttributeId { get; set; }
    public long? newFileRadioButtonAttributeId { get; set; }
}
