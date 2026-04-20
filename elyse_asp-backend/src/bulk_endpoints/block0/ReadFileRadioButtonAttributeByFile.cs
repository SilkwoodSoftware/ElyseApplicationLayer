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

// Selects radio button attributes linked to a given file.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/file/radio-button/attribute/file")]
[ApiController]
public class ReadFileRadioButtonAttributeByFile : BaseStoredProcedureController
{
    public ReadFileRadioButtonAttributeByFile(StoredProcedureService storedProcedureService, ILogger<ReadFileRadioButtonAttributeByFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long fileId)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving radio button attributes for file ID {fileId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_file_rb_attr_by_file", inputParameters);
            },
            result =>
            {
                var attributesData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");


                var response = new
                {
                    attributesData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
