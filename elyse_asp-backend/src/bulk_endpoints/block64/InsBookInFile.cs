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

// Inserts a book in file.
[Route("api/book-in-file")]
[ApiController]
public class InsBookInFile : BaseStoredProcedureController
{
    public InsBookInFile(StoredProcedureService storedProcedureService, ILogger<InsBookInFile> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost("create")]
    public async Task<IActionResult> InsertBookInFile([FromBody] InsBookInFileDto request)
    {
        return await ExecuteWithErrorHandlingAsync(
            "inserting book in file",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@booking_id", request.bookingId ?? (object)DBNull.Value },
                    { "@fileid", request.fileId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_book_in_file", parameters);
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

public class InsBookInFileDto
{
    public long? bookingId { get; set; }
    public long? fileId { get; set; }
}
