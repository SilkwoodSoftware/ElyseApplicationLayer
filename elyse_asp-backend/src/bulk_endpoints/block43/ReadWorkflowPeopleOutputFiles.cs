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

// Select output files linked to steps via individuals.
[Route("api/workflow/people/output-file")]
[ApiController]
public class ReadWorkflowPeopleOutputFiles : BaseStoredProcedureController
{
    public ReadWorkflowPeopleOutputFiles(StoredProcedureService storedProcedureService, ILogger<ReadWorkflowPeopleOutputFiles> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading workflow people output files",
            async () =>
            {
                var parameters = new Dictionary<string, object>();

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_wf_people_output_files", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    result.ResultSets
                };

                return Ok(response);
            });
    }
}
