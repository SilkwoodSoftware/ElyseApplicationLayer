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

// Inserts a record to multi-select people list link.
[Route("api/document/multi-select/people/link")]
[ApiController]
public class InsertDocMultiSelectPeopleLink : BaseStoredProcedureController
{
    public InsertDocMultiSelectPeopleLink(StoredProcedureService storedProcedureService, ILogger<InsertDocMultiSelectPeopleLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] InsertDocMultiSelectPeopleLinkRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting document multi-select people link",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@peoplelistid", request.peopleListId ?? (object)DBNull.Value },
                    { "@genfield_nameid", request.generalFieldNameId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_doc_people_list_link", parameters);
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

public class InsertDocMultiSelectPeopleLinkRequest
{
    public string? documentId { get; set; }
    public long? peopleListId { get; set; }
    public long? generalFieldNameId { get; set; }
}
