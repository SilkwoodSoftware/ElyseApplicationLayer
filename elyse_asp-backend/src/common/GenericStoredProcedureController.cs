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

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using AutoMapper;

[Route("api/stored-procedure")]
[ApiController]
public class GenericStoredProcedureController : BaseStoredProcedureController
{
    public GenericStoredProcedureController(StoredProcedureService storedProcedureService, ILogger<GenericStoredProcedureController> logger, IMapper? mapper)
        : base(storedProcedureService, logger, mapper)
    {
    }

    [HttpPost("{storedProcedureName}")]
    public async Task<IActionResult> ExecuteStoredProcedure(string storedProcedureName, [FromBody] object inputParameters)
    {
        return await ExecuteWithErrorHandlingAsync(
            $"executing stored procedure '{storedProcedureName}'",
            async () =>
            {
                Dictionary<string, object> mappedParameters = new Dictionary<string, object>();
                if (_mapper != null && inputParameters != null)
                {
                    mappedParameters = _mapper.Map<Dictionary<string, object>>(inputParameters);
                }
                return await _storedProcedureService.ExecuteStoredProcedureAsync(storedProcedureName, mappedParameters);
            },
            result => Ok(result));
    }
}
