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
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;

[Route("api/windows-accounts")]
[ApiController]
public class ReadWindowsUsersAndGroupsController : ControllerBase
{
    private readonly ReadWindowsUsersAndGroupsService _usersAndGroupsService;
    private readonly ILogger<ReadWindowsUsersAndGroupsController> _logger;

    public ReadWindowsUsersAndGroupsController(ReadWindowsUsersAndGroupsService usersAndGroupsService, ILogger<ReadWindowsUsersAndGroupsController> logger)
    {
        _usersAndGroupsService = usersAndGroupsService;
        _logger = logger;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetWindowsUsers()
    {
        try
        {
            var users = await _usersAndGroupsService.GetWindowsUsers();
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving Windows users.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetWindowsGroups()
    {
        try
        {
            var groups = await _usersAndGroupsService.GetWindowsGroups();
            return Ok(groups);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while retrieving Windows groups.");
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }
}
