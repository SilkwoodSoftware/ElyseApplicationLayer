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

// Updates the list position and filter group of a common object list item record.
[Route("api/common-object/details")]
[ApiController]
public class UpdateCommonObjectListItem : BaseStoredProcedureController
{
    public UpdateCommonObjectListItem(StoredProcedureService storedProcedureService, ILogger<UpdateCommonObjectListItem> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateCommonObjectListItemRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating common object list item",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@commonobjlistid", request.commonObjectListId ?? (object)DBNull.Value },
                    { "@commonobjectid", request.commonObjectId ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_common_obj_list_item", parameters);
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

public class UpdateCommonObjectListItemRequest
{
    public long? commonObjectListId { get; set; }
    public long? commonObjectId { get; set; }
    public short? listPosition { get; set; }
}
