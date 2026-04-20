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

// Creates a default record for a form file multi-select object.
// Restricted to forms which the controller has access permission for.
[Route("api/form/file/multi-select/default")]
[ApiController]
public class InsertFormFileMultiSelectDefault : BaseStoredProcedureController
{
    public InsertFormFileMultiSelectDefault(StoredProcedureService storedProcedureService, ILogger<InsertFormFileMultiSelectDefault> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertFormFileMultiSelectDefaultRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating form file multi-select default",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@filemslistid", request.fileMultiSelectListId ?? (object)DBNull.Value },
                    { "@filemsattrid", request.fileMultiSelectAttributeId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_INS_frm_file_multi_sel_def", parameters);
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

public class InsertFormFileMultiSelectDefaultRequest
{
    public long? formId { get; set; }
    public long? fileMultiSelectListId { get; set; }
    public long? fileMultiSelectAttributeId { get; set; }
}
