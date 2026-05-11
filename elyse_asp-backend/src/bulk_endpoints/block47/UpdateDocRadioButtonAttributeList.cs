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

// Updates the radio button list id of a doc radio button attribute.
[Route("api/document/radio-button/attribute/list")]
[ApiController]
public class UpdateDocRadioButtonAttributeList : BaseStoredProcedureController
{
    public UpdateDocRadioButtonAttributeList(StoredProcedureService storedProcedureService, ILogger<UpdateDocRadioButtonAttributeList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateDocRadioButtonAttributeListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating document radio button attribute list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.docRadioButtonAttributeId ?? (object)DBNull.Value },
                    { "@radioblistid", request.docRadioButtonListId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_UPD_doc_rb_attr_list", parameters);
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

public class UpdateDocRadioButtonAttributeListRequest
{
    public long? docRadioButtonAttributeId { get; set; }
    public int? docRadioButtonListId { get; set; }
}
