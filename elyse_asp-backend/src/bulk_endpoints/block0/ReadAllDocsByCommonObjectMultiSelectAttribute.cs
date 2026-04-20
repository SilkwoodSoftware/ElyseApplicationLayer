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

//Lists all the metadata for documents for a given common object multi-select attribute.  
//Does not list associated files and does not apply a filter group.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Threading.Tasks;

[Route("api/document/common-object")]
[ApiController]
public class ReadAllDocsByCommonObjectMultiSelectAttribute : BaseStoredProcedureController
{
    public ReadAllDocsByCommonObjectMultiSelectAttribute(StoredProcedureService storedProcedureService, ILogger<ReadAllDocsByCommonObjectMultiSelectAttribute> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long commonObjectListId, [FromQuery] long commonObjectId, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving documents for common object list ID {commonObjectListId} and common object ID {commonObjectId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@commonobjlistid", commonObjectListId },
                    { "@commonobjectid", commonObjectId },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_docs_by_co_ms_attr", inputParameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");

                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    documentData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    outputFormId,
                    formName,
                    tooltips
                };

                return Ok(response);
            });
    }
}
