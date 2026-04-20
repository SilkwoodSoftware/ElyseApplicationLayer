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

// Updates a record in people.people_list_names to update a people list name
[Route("api/people-list/name")]
[ApiController]
public class UpdatePeopleListName : BaseStoredProcedureController
{
    public UpdatePeopleListName(StoredProcedureService storedProcedureService, ILogger<UpdatePeopleListName> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdatePeopleListNameRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "updating people list name",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@recordid", request.peopleListId ?? (object)DBNull.Value },
                    { "@mnemonic", request.mnemonic ?? (object)DBNull.Value },
                    { "@peoplelist_name", request.peopleListName ?? (object)DBNull.Value },
                    { "@description", request.description ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("controlling.usp_UPD_people_list_name", parameters);
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

public class UpdatePeopleListNameRequest
{
    public long? peopleListId { get; set; }
    public string mnemonic { get; set; }
    public string peopleListName { get; set; }
    public string description { get; set; }
}
