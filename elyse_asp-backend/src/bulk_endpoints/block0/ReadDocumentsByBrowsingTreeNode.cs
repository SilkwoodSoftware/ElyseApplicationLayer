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

// Selects all of the documents via selection of a browsing tree node. 
// Tag descendants are applied if @tag_descendants =  'ON'.  Defaults to ON.
// If no tag tree ID is supplied then the default is retrieved from global settings.
// No filter group is applied.  No file details are returned.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/documents/browsing-tree")]
[ApiController]
public class ReadAllDocumentsByBrowsingTreeNode : BaseStoredProcedureController
{
    public ReadAllDocumentsByBrowsingTreeNode(StoredProcedureService storedProcedureService, ILogger<ReadAllDocumentsByBrowsingTreeNode> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long tagBrowsingTreeNodeId, [FromQuery] long? tagTreeId = null, [FromQuery] string tagDescendants = "ON", [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving documents for browsing tree node ID {tagBrowsingTreeNodeId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@tag_br_tree_node_id", tagBrowsingTreeNodeId },
                    { "@tag_treeid", tagTreeId ?? (object)DBNull.Value },
                    { "@tag_descendants", tagDescendants },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_all_docs_by_br_tr_node", inputParameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfDocs = GetOutputParameterValue(result, "@numdocs");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");

                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocumentData(documentData);

                var response = new
                {
                    documentData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfDocs,
                    outputFormId,
                    formName,
                    tooltips
                };

                return Ok(response);
            });
    }
}
