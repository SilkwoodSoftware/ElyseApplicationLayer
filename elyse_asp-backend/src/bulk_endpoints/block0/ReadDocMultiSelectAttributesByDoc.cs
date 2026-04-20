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

// Selects the multi-select attributes linked to a given document.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/document/multi-select/attribute/doc")]
[ApiController]
public class ReadDocMultiSelectAttributesByDoc : BaseStoredProcedureController
{
    public ReadDocMultiSelectAttributesByDoc(StoredProcedureService storedProcedureService, ILogger<ReadDocMultiSelectAttributesByDoc> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string documentId)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving multi-select attributes for document ID {documentId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_doc_ms_attr_by_doc", inputParameters);
            },
            result =>
            {
                var attributesData = ConvertIdFieldsToNumbers(result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>());
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var tooltips = ExtractTooltips(attributesData);

                var response = new
                {
                    attributesData,
                    transactionMessage,
                    transactionStatus,
                    tooltips
                };

                return Ok(response);
            });
    }
}
