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

// Creates a common object list record.
[Route("api/common-object/list")]
[ApiController]
public class InsertCommonObjectListName : BaseStoredProcedureController
{
    public InsertCommonObjectListName(StoredProcedureService storedProcedureService, ILogger<InsertCommonObjectListName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertCommonObjectListNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "creating common object list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@listname", request.listName ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value },
                    { "@commonobjattrid", request.commonObjAttrId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("configuring.usp_INS_com_obj_list_name", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var newListId = GetOutputParameterValue(result, "@newrecordid");

                var response = new
                {
                    newListId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsertCommonObjectListNameRequest
{
    public string? listName { get; set; }
    public string? mnemonic { get; set; }
    public string? description { get; set; }
    public long? commonObjAttrId { get; set; }
}
