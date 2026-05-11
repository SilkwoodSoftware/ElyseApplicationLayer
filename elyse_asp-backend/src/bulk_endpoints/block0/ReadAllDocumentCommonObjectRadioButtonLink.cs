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

// Lists all document common object radio button list objects which are linked to any document

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/common-objects/radio-button")]
[ApiController]
public class ReadAllDocumentCommonObjectRadioButtonLink : BaseStoredProcedureController
{
    public ReadAllDocumentCommonObjectRadioButtonLink(StoredProcedureService storedProcedureService, ILogger<ReadAllDocumentCommonObjectRadioButtonLink> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read()
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving all document common object radio button links",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>();
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_doc_com_obj_rb_lnk", inputParameters);
            },
            result =>
            {
                var linksData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                linksData = ConvertIdFieldsToNumbers(linksData);
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    linksData,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}
