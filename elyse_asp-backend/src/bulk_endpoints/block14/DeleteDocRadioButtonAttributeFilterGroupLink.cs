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

// Deletes a document radio button attribute ID to filter group ID link.
[Route("api/document/radio-button/attribute/filter-group/link")]
[ApiController]
public class DeleteDocRadioButtonAttributeFilterGroupLink : BaseStoredProcedureController
{
    public DeleteDocRadioButtonAttributeFilterGroupLink(StoredProcedureService storedProcedureService, ILogger<DeleteDocRadioButtonAttributeFilterGroupLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> Delete([FromBody] DeleteDocRadioButtonAttributeFilterGroupLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting document radio button attribute filter group link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docradiobattrid", request.docRadioButtonAttributeId ?? (object)DBNull.Value },
                    { "@filtergroupid", request.filterGroupId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_DEL_doc_rb_attr_fg_link", parameters);
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

public class DeleteDocRadioButtonAttributeFilterGroupLinkRequest
{
    public long? docRadioButtonAttributeId { get; set; }
    public long? filterGroupId { get; set; }
}
