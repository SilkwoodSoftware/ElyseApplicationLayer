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

// Updates a form document multi-select default.
[Route("api/form/document/multi-select/default")]
[ApiController]
public class UpdateFormDocMultiSelectDefault : BaseStoredProcedureController
{
    public UpdateFormDocMultiSelectDefault(StoredProcedureService storedProcedureService, ILogger<UpdateFormDocMultiSelectDefault> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFormDocMultiSelectDefaultRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating form document multi-select default",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@docmslistid", request.docMultiSelectListId ?? (object)DBNull.Value },
                    { "@docmsattrid", request.DocMultiSelectAttributeId ?? (object)DBNull.Value },
                    { "@newdocmsattrid", request.newdocMultiSelectAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_form_doc_multi_sel_def", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    result = result.ResultSets?[0]
                };

                return Ok(response);
            });
    }
}

public class UpdateFormDocMultiSelectDefaultRequest
{
    public long? formId { get; set; }
    public long? docMultiSelectListId { get; set; }
    public long? DocMultiSelectAttributeId { get; set; }
    public long? newdocMultiSelectAttributeId { get; set; }
}
