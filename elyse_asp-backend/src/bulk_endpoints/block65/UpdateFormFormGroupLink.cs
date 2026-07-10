/*
 * Copyright 2026 Silkwood Software Pty. Ltd.
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

// Updates a form's form group link.
[Route("api/form-form-group-link")]
[ApiController]
public class UpdateFormFormGroupLink : BaseStoredProcedureController
{
    public UpdateFormFormGroupLink(StoredProcedureService storedProcedureService, ILogger<UpdateFormFormGroupLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFormFormGroupLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating form to form group link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@newformgroupid", request.newFormGroupId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_form_form_group_link", parameters);
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

public class UpdateFormFormGroupLinkRequest
{
    public long? formId { get; set; }
    public long? newFormGroupId { get; set; }
}
