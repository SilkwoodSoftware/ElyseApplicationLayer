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

// Selects all of the tags linked to a given document.
// Tag descendants are applied if @tag_descendants =  'ON'.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/tag/document")]
[ApiController]
public class ReadTagsByDocument : BaseStoredProcedureController
{
    public ReadTagsByDocument(StoredProcedureService storedProcedureService, ILogger<ReadTagsByDocument> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string documentId, [FromQuery] string tagDescendants = "OFF")
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving tags for document ID {documentId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId },
                    { "@tag_descendants", tagDescendants }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_tags_by_doc", inputParameters);
            },
            result =>
            {
                var tagsData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    tagsData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
