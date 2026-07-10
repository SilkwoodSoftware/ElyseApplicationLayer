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
using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Threading.Tasks;
using FileStorage.Services;

[Route("api/file")]
[ApiController]
public class CreateFileController : BaseStoredProcedureController
{
    private readonly FileTextExtractionService _textExtractionService;
    private readonly IThumbnailGenerationService _thumbnailGenerationService;

    public CreateFileController(
        StoredProcedureService storedProcedureService,
        ILogger<CreateFileController> logger,
        FileTextExtractionService textExtractionService,
        IThumbnailGenerationService thumbnailGenerationService,
        IdFieldTypesProvider idFieldTypesProvider)
        : base(storedProcedureService, logger, null, idFieldTypesProvider)
    {
        _textExtractionService = textExtractionService ?? throw new ArgumentNullException(nameof(textExtractionService));
        _thumbnailGenerationService = thumbnailGenerationService ?? throw new ArgumentNullException(nameof(thumbnailGenerationService));
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile([FromForm] UploadFileDto uploadFileDto)
    {
        try
        {
            if (uploadFileDto == null || uploadFileDto.File == null)
            {
                return BadRequest(new { message = "The file is required." });
            }

            using var memoryStream = new MemoryStream();
            await uploadFileDto.File.CopyToAsync(memoryStream);

            // Extract text content from the file
            string? extractedTextContent = null;
            try
            {
               extractedTextContent = await _textExtractionService.ExtractAndSanitizeTextContent(memoryStream, uploadFileDto.storedFilename);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Text extraction failed, continuing with file upload without text content.");
            }

            // Generate thumbnail from the file - allow upload to continue even if thumbnail generation fails
            byte[]? thumbnailData = uploadFileDto.Thumbnail; // Use provided thumbnail if available
            _logger.LogInformation("Starting thumbnail generation for file: {fileName}. Provided thumbnail size: {ProvidedSize}",
                uploadFileDto.storedFilename, thumbnailData?.Length ?? 0);
            
            if (thumbnailData == null || thumbnailData.Length == 0)
            {
                _logger.LogInformation("Generating thumbnail for file: {fileName}, File size: {FileSize} bytes",
                    uploadFileDto.storedFilename, memoryStream.Length);
                
                // Reset memory stream position for thumbnail generation
                memoryStream.Position = 0;
                thumbnailData = await _thumbnailGenerationService.GenerateThumbnailAsync(
                    memoryStream.ToArray(),
                    uploadFileDto.storedFilename ?? string.Empty,
                    400);
                
                if (thumbnailData == null || thumbnailData.Length == 0)
                {
                    _logger.LogWarning("Thumbnail generation failed for file: {fileName}. Continuing upload without thumbnail.", uploadFileDto.storedFilename);
                    thumbnailData = new byte[0]; // Empty byte array instead of null
                }
                else
                {
                    _logger.LogInformation("Thumbnail generation completed for file: {fileName}. Generated thumbnail size: {ThumbnailSize} bytes",
                        uploadFileDto.storedFilename, thumbnailData.Length);
                }
            }
            else
            {
                _logger.LogInformation("Using provided thumbnail for file: {fileName}", uploadFileDto.storedFilename);
            }

            var inputParameters = new Dictionary<string, object>
            {
                { "@file_content_bin", memoryStream.ToArray() },
                { "@stored_filename", uploadFileDto.storedFilename ?? (object)DBNull.Value },
                { "@transactiongroup", uploadFileDto.transactionGroupId ?? (object)DBNull.Value },
                { "@documentid", uploadFileDto.documentId ?? (object)DBNull.Value },
                { "@docidautogen", uploadFileDto.docIdAutoGen ?? (object)DBNull.Value },
                { "@filegroupid", uploadFileDto.fileGroupId ?? (object)DBNull.Value },
                { "@docgroupid", uploadFileDto.docGroupId ?? (object)DBNull.Value },
                { "@duplicate_check", uploadFileDto.duplicateCheck ?? (object)DBNull.Value },
                { "@retention_months", uploadFileDto.retentionMonths ?? (object)DBNull.Value },
                { "@full_text_content", extractedTextContent ?? (object)DBNull.Value },
                { "@thumbnail", thumbnailData ?? new byte[0] },
            };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("editing.usp_INS_file_binary_input", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString(),
                newFileId = result.OutputParameters["@fileid"] != null && result.OutputParameters["@fileid"] != DBNull.Value
                    ? Convert.ToInt64(result.OutputParameters["@fileid"])
                    : (long?)null,
                newDocId = result.OutputParameters["@newdocumentid"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while uploading file.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while uploading file.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
