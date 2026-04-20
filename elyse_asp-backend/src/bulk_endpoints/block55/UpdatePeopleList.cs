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

// Updates the list position and filter group of a people list record.
[Route("api/people-list")]
[ApiController]
public class UpdatePeopleList : BaseStoredProcedureController
{
    public UpdatePeopleList(StoredProcedureService storedProcedureService, ILogger<UpdatePeopleList> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdatePeopleListRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating people list",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value },
                    { "@sidid", request.personId ?? (object)DBNull.Value },
                    { "@listposition", request.listPosition ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_people_list", parameters);
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

public class UpdatePeopleListRequest
{
    public long? peopleListId { get; set; }
    public long? personId { get; set; }
    public short? listPosition { get; set; }
}
