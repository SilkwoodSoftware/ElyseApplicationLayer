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

// Lists all file common object radio button objects for a given file.
[Route("api/file/common-object/radio-button/link/file")]
[ApiController]
public class ReadFileCommonObjectRadioButtonLinkByFile : BaseStoredProcedureController
{
    public ReadFileCommonObjectRadioButtonLinkByFile(StoredProcedureService storedProcedureService, ILogger<ReadFileCommonObjectRadioButtonLinkByFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? fileId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading file common object radio button link by file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_fl_cm_obj_rb_lnk_by_fl", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    resultSets = result.ResultSets
                };

                return Ok(response);
            });
    }
}
