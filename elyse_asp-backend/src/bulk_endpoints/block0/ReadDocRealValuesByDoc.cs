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

// List the real number values for a document.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/document/real-values/doc")]
[ApiController]
public class ReadDocRealValuesByDoc : BaseStoredProcedureController
{
    public ReadDocRealValuesByDoc(StoredProcedureService storedProcedureService, ILogger<ReadDocRealValuesByDoc> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string documentId)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving real number values for document ID {documentId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_doc_real_values_by_doc", inputParameters);
            },
            result =>
            {
                var realNumberData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var tooltips = ExtractTooltips(realNumberData);

                var response = new
                {
                    realNumberData,
                    transactionMessage,
                    transactionStatus,
                    tooltips
                };

                return Ok(response);
            });
    }
}
