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
using Microsoft.AspNetCore.Mvc.Infrastructure;
using System;
using System.Threading.Tasks;

public class CustomFileStreamResult : IActionResult
{
    private readonly byte[] _fileContents;
    private readonly string _fileName;
    private readonly string _contentType;

    public CustomFileStreamResult(byte[] fileContents, string fileName, string contentType)
    {
        _fileContents = fileContents;
        _fileName = fileName;
        _contentType = contentType;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;
        var request = context.HttpContext.Request;
        // Remove the existing Content-Disposition header if it exists
        response.Headers.Remove("Content-Disposition");        
        response.Headers.Add("Content-Disposition", $"attachment; filename=\"{_fileName}\"; filename*=UTF-8''{Uri.EscapeDataString(_fileName)}");
        response.ContentType = _contentType;

        var rangeHeader = request.Headers["Range"].FirstOrDefault();
        if (rangeHeader != null)
        {
            // Handle range request
            var range = rangeHeader.Replace("bytes=", "").Split('-');
            var start = int.Parse(range[0]);
            var end = range.Length > 1 && !string.IsNullOrEmpty(range[1]) ? int.Parse(range[1]) : _fileContents.Length - 1;

            response.StatusCode = 206; // Partial Content
            response.Headers.Add("Content-Range", $"bytes {start}-{end}/{_fileContents.Length}");
            response.ContentLength = end - start + 1;

            await response.Body.WriteAsync(_fileContents, start, (int)response.ContentLength);
        }
        else
        {
            // Send full file
            response.ContentLength = _fileContents.Length;
            await response.Body.WriteAsync(_fileContents, 0, _fileContents.Length);
        }

        await response.Body.FlushAsync();
    }
}
    
