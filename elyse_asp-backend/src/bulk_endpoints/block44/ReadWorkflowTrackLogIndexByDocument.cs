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

// Retrieves track log index records for a given document ID.
[Route("api/workflow/track-log/index/document")]
[ApiController]
public class ReadWorkflowTrackLogIndexByDocument : BaseStoredProcedureController
{
    public ReadWorkflowTrackLogIndexByDocument(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowTrackLogIndexByDocument> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] string documentId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow track log index by document",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", documentId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_tr_log_index_by_doc", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRecords = GetOutputParameterValue(result, "@numrecords");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRecords,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
