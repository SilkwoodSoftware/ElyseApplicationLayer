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

// Updates a document radio button to filter group link record.
[Route("api/document/radio-button/attribute/filter-group/link")]
[ApiController]
public class UpdateDocRadioButtonAttributeFilterGroupLink : BaseStoredProcedureController
{
    public UpdateDocRadioButtonAttributeFilterGroupLink(StoredProcedureService storedProcedureService, ILogger<UpdateDocRadioButtonAttributeFilterGroupLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocRadioButtonAttributeFilterGroupLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document radio button attribute filter group link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@docradiobattrid", request.docRadioButtonAttributeId ?? (object)DBNull.Value },
                    { "@filtergroupid", request.filterGroupId ?? (object)DBNull.Value },
                    { "@newdoc_radiobattrid", request.newDocRadioButtonAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_doc_rb_attr_fg_link", parameters);
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

public class UpdateDocRadioButtonAttributeFilterGroupLinkRequest
{
    public long? docRadioButtonAttributeId { get; set; }
    public long? filterGroupId { get; set; }
    public long? newDocRadioButtonAttributeId  { get; set; }
}
