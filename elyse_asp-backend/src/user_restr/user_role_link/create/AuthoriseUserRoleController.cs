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
using System.Threading.Tasks;
using System.Data.SqlClient;
using System.Collections.Generic;
using System.Linq;

[Route("api/authorise-user")]
[ApiController]
public class AuthoriseUserRoleController : BaseStoredProcedureController
{
    public AuthoriseUserRoleController(StoredProcedureService storedProcedureService, ILogger<AuthoriseUserRoleController> logger)
        : base(storedProcedureService, logger, null)
    {
    }

    [HttpPost]
    public async Task<IActionResult> AuthoriseUserRole([FromBody] AuthoriseUserRoleDto dto)
    {
        try
        {
            var inputParameters = new Dictionary<string, object> { { "@new_user_sid_id", dto.userId }, { "@role_to_add", dto.roleName } };
            var result = await _storedProcedureService.ExecuteStoredProcedureAsync("authorising.usp_AUTHORISE_user_role", inputParameters);

            var response = new
            {
                transactionMessage = result.OutputParameters["@message"]?.ToString(),
                transactionStatus = result.OutputParameters["@transaction_status"]?.ToString()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "A SQL exception occurred while authorising user role.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An exception occurred while authorising user role.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}

public class AuthoriseUserRoleDto
{
    public long userId { get; set; }
    public string? roleName { get; set; }
}
