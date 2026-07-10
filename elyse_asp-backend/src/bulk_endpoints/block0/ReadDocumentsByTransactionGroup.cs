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

// Selects document IDs with a given transaction group.
// If no form ID is supplied then the default will be used.
// NULL transaction group ID is permitted and will return records with NULL transaction group.

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Threading.Tasks;

[Route("api/documents/transaction-group")]
[ApiController]
public class ReadDocumentsByTransactionGroup : BaseStoredProcedureController
{
    public ReadDocumentsByTransactionGroup(StoredProcedureService storedProcedureService, ILogger<ReadDocumentsByTransactionGroup> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> Read([FromQuery] long transactionGroupId, [FromQuery] long? formId = null)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"retrieving documents for transaction group ID {transactionGroupId}",
            async () =>
            {
                var inputParameters = new Dictionary<string, object>
                {
                    { "@transactiongroup", transactionGroupId },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_docs_by_trans_group", inputParameters);
            },
            result =>
            {
                var documentData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var numberOfDocs = GetOutputParameterValue(result, "@numdocs");

                var tooltips = ExtractTooltips(documentData);
                var transformedData = TransformDocDataExFiles(documentData);

                var response = new
                {
                    documentData = transformedData,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    numberOfDocs,
                    tooltips
                };

                return Ok(response);
            });
    }
}
