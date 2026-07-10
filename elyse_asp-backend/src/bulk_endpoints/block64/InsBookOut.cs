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

// Inserts a book out record.
[Route("api/book-out")]
[ApiController]
public class InsBookOut : BaseStoredProcedureController
{
    public InsBookOut(StoredProcedureService storedProcedureService, ILogger<InsBookOut> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> InsertBookOut([FromBody] InsBookOutDto request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting book out",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@documentid", request.documentId ?? (object)DBNull.Value },
                    { "@comments", request.comments ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_book_out", parameters);
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

public class InsBookOutDto
{
    public string? documentId { get; set; }
    public string? comments { get; set; }
}
