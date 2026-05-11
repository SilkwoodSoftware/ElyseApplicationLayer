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

// Lists all the person lists for a given individual.
[Route("api/people-list/person")]
[ApiController]
public class ReadPeopleListsByPerson : BaseStoredProcedureController
{
    public ReadPeopleListsByPerson(StoredProcedureService storedProcedureService, ILogger<ReadPeopleListsByPerson> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] ReadPeopleListsByPersonRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading people lists by person",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@sidid", request.personId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_people_lists_by_person", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}

public class ReadPeopleListsByPersonRequest
{
    public long? personId { get; set; }
}
