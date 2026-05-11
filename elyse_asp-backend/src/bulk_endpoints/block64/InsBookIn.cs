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

// Inserts a book in record.
[Route("api/book-in")]
[ApiController]
public class InsBookIn : BaseStoredProcedureController
{
    public InsBookIn(StoredProcedureService storedProcedureService, ILogger<InsBookIn> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> InsertBookIn([FromBody] InsBookInDto request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting book in",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@comments", request.comments ?? (object)DBNull.Value },
                    { "@release_num", request.releaseNum ?? (object)DBNull.Value },
                    { "@fileid", request.fileId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_book_in", parameters);
            },
            result =>
            {
                var bookingId = GetOutputParameterValue(result, "@booking_id");
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    bookingId,
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class InsBookInDto
{
    public string? documentId { get; set; }
    public string? comments { get; set; }
    public string? releaseNum { get; set; }
    public long? fileId { get; set; }
}
