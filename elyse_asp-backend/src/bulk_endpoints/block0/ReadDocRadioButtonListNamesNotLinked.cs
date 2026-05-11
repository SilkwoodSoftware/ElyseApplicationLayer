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

// Selects the radio button list names which are not already linked to the given document.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/document/radio-button/list/not-linked")]
[ApiController]
public class ReadDocRadioButtonListNamesNotLinked : BaseStoredProcedureController
{
    public ReadDocRadioButtonListNamesNotLinked(StoredProcedureService storedProcedureService, ILogger<ReadDocRadioButtonListNamesNotLinked> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string documentId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving document radio button list names not linked",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_doc_rb_list_not_linkd", inputParameters);
            },
            result =>
            {
                var listsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                listsData = ConvertIdFieldsToNumbers(listsData);
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    listsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
