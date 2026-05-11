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

// Deletes a book in ID.
[Route("api/book-in-id")]
[ApiController]
public class DelBookInId : BaseStoredProcedureController
{
    public DelBookInId(StoredProcedureService storedProcedureService, ILogger<DelBookInId> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("delete")]
    public async Task<IActionResult> DeleteBookInId([FromBody] DelBookInIdRequest request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "deleting book in ID",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@booking_id", request.bookingId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_DEL_book_in_id", parameters);
            },
            result =>
            {
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");

                var response = new
                {
                    transactionMessage,
                    transactionStatus
                };

                return Ok(response);
            });
    }
}

public class DelBookInIdRequest
{
    public long? bookingId { get; set; }
}
