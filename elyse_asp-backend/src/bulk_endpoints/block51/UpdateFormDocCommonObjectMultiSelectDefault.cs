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

// Updates a form document common object multi-select default.
[Route("api/form/doc/common-object/multi-select/default")]
[ApiController]
public class UpdateFormDocCommonObjectMultiSelectDefault : BaseStoredProcedureController
{
    public UpdateFormDocCommonObjectMultiSelectDefault(StoredProcedureService storedProcedureService, ILogger<UpdateFormDocCommonObjectMultiSelectDefault> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateFormDocCommonObjectMultiSelectDefaultRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating form document common object multi-select default",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@formid", request.formId ?? (object)DBNull.Value },
                    { "@commonobjlistid", request.commonObjectListId ?? (object)DBNull.Value },
                    { "@commonobjectid", request.commonObjectId ?? (object)DBNull.Value },
                    { "@newcommonobjectid", request.NewCommonObjectId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_fm_dc_c_ob_ms_def", parameters);
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

public class UpdateFormDocCommonObjectMultiSelectDefaultRequest
{
    public long? formId { get; set; }
    public long? commonObjectListId { get; set; }
    public long? commonObjectId { get; set; }
    public long? NewCommonObjectId { get; set; }
}
