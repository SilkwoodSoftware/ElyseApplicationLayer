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
using System.Linq;
using System.Threading.Tasks;

// This procedure reads the data and the thumbnail for a single file.
[Route("api/select-one-file-data")]
[ApiController]
public class SelSelOneFileData : BaseStoredProcedureController
{
    public SelSelOneFileData(StoredProcedureService storedProcedureService, ILogger<SelSelOneFileData> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpGet("read")]
    public async Task<IActionResult> GetSellOneFileData([FromQuery] long? fileId, [FromQuery] long? formId)
    {
        return await ExecuteWithErrorHandlingAsync(
            "retrieving single file data",
            async () =>
            {
                var parameters = new Dictionary<string, object>
                {
                    { "@fileid", fileId ?? (object)DBNull.Value },
                    { "@formid", formId ?? (object)DBNull.Value }
                };
                return await _storedProcedureService.ExecuteStoredProcedureAsync("reading.usp_SEL_one_file_data", parameters);
            },
            result =>
            {
                var fileData = result.ResultSets.FirstOrDefault() ?? new List<Dictionary<string, object>>();
                var transactionMessage = GetOutputParameterValue(result, "@message");
                var transactionStatus = GetOutputParameterValue(result, "@transaction_status");
                var numberOfRows = GetOutputParameterValue(result, "@numrows");
                var outputFormId = GetOutputParameterValue(result, "@outputformid");
                var formName = GetOutputParameterValue(result, "@formname");
                var tooltips = ExtractTooltips(fileData);

                var transformedFilesData = TransformFilesData(fileData);

                // Access thumbnail directly from output parameters
                string thumbnailBase64 = null;
                var parameterKeys = result.OutputParameters?.Keys?.ToArray() ?? new string[0];
                _logger.LogInformation("All output parameters for file ID {FileId}: {Parameters}",
                    fileId, string.Join(", ", parameterKeys));

                if (result.OutputParameters != null && result.OutputParameters.ContainsKey("@thumbnail"))
                {
                    var thumbnailRaw = result.OutputParameters["@thumbnail"];
                    _logger.LogInformation("Direct thumbnail parameter for file ID {FileId}: Type={Type}, IsNull={IsNull}",
                        fileId, thumbnailRaw?.GetType()?.Name ?? "null", thumbnailRaw == null);

                    if (thumbnailRaw != null)
                    {
                        if (thumbnailRaw is byte[] thumbnailBytes && thumbnailBytes.Length > 0)
                        {
                            try
                            {
                                thumbnailBase64 = Convert.ToBase64String(thumbnailBytes);
                                _logger.LogInformation("Successfully converted {ByteCount} bytes to base64 for file ID: {FileId}",
                                    thumbnailBytes.Length, fileId);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to convert thumbnail bytes to base64 for file ID: {FileId}", fileId);
                            }
                        }
                        else
                        {
                            var rawString = thumbnailRaw.ToString();
                            _logger.LogInformation("Thumbnail as string for file ID {FileId}: '{Data}'",
                                fileId, rawString?.Substring(0, Math.Min(100, rawString?.Length ?? 0)));

                            // Handle hex string representation
                            if (!string.IsNullOrEmpty(rawString) && rawString.StartsWith("0x"))
                            {
                                try
                                {
                                    var hexString = rawString.Substring(2);
                                    var thumbnailBytesFromHex = Convert.FromHexString(hexString);
                                    thumbnailBase64 = Convert.ToBase64String(thumbnailBytesFromHex);
                                    _logger.LogInformation("Successfully converted {ByteCount} bytes from hex to base64 for file ID: {FileId}",
                                        thumbnailBytesFromHex.Length, fileId);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Failed to convert hex thumbnail to base64 for file ID: {FileId}", fileId);
                                }
                            }
                            else if (!string.IsNullOrEmpty(rawString) && rawString != "System.Byte[]")
                            {
                                thumbnailBase64 = rawString;
                            }
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("No @thumbnail parameter found in output parameters for file ID: {FileId}", fileId);
                }

                var response = new
                {
                    fileData = transformedFilesData,
                    thumbnail = thumbnailBase64,
                    transactionMessage,
                    transactionStatus,
                    numberOfRows,
                    outputFormId,
                    formName,
                    tooltips
                };

                return Ok(response);
            });
    }
}
