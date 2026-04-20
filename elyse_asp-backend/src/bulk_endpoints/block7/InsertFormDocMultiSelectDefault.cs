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

// Creates a default record for a form document multi-select object.
[Route("api/form/document/multi-select/default")]
[ApiController]
public class InsertFormDocMultiSelectDefault : BaseStoredProcedureController
{
    public InsertFormDocMultiSelectDefault(StoredProcedureService storedProcedureService, ILogger<InsertFormDocMultiSelectDefault> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertFormDocMultiSelectDefaultRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating form document multi-select default",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@docmslistid", request.docMultiSelectListId ?? (object)DBNull.Value },
                    { "@docmsattrid", request.DocMultiSelectAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_form_doc_multi_sel_def", parameters);
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

public class InsertFormDocMultiSelectDefaultRequest
{
    public long? formId { get; set; }
    public long? docMultiSelectListId { get; set; }
    public long? DocMultiSelectAttributeId { get; set; }
}
