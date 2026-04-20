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

// Lists all the document and associated file records for a given common object radio button attribute.
// Applies a filter group.
[Route("api/documents/common-object/radio-button/attribute")]
[ApiController]
public class ReadDocsByCommonObjectRadioButtonAttribute : BaseStoredProcedureController
{
    public ReadDocsByCommonObjectRadioButtonAttribute(StoredProcedureService storedProcedureService, ILogger<ReadDocsByCommonObjectRadioButtonAttribute> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long? commonObjectListId = null, [FromQuery] long? commonObjectId = null, [FromQuery] long? filterGroupId = null, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            "reading documents by common object radio button attribute",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@commonobjlistid", commonObjectListId ?? (object)DBNull.Value },
                    { "@commonobjectid", commonObjectId ?? (object)DBNull.Value },
                    { "@filtergroupid", filterGroupId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };

                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_by_co_rb_attr", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numRows = GetOutputParameterValue(result, "@numrows");
                var numRecords = GetOutputParameterValue(result, "@numrecords");
                var numDocs = GetOutputParameterValue(result, "@numdocs");

                var documentData = result.ResultSets.Count > 0 ? result.ResultSets[0] : new List<Dictionary<string, object>>();
                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocDataExFiles(documentData);

                var response = new
                {
                    transactionMessage,
                    transactionStatus,
                    numRows,
                    numRecords,
                    numDocs,
                    tooltips,
                    documentData = transformedData
                };

                return Ok(response);
            });
    }
}
