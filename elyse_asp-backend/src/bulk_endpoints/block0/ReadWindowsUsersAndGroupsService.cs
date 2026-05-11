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


using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Diagnostics;

public class ReadWindowsUsersAndGroupsService
{
    private readonly ILogger<ReadWindowsUsersAndGroupsService> _logger;

    public ReadWindowsUsersAndGroupsService(ILogger<ReadWindowsUsersAndGroupsService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<string>> GetWindowsUsers()
    {
        return await ExecuteCommandAsync("net user");
    }

    public async Task<List<string>> GetWindowsGroups()
    {
        return await ExecuteCommandAsync("net localgroup");
    }

    private async Task<List<string>> ExecuteCommandAsync(string command)
    {
        var processStartInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = $"/C {command}",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        var process = new Process { StartInfo = processStartInfo };
        var output = new List<string>();

        process.OutputDataReceived += (sender, args) =>
        {
            if (!string.IsNullOrEmpty(args.Data))
            {
                output.Add(args.Data);
            }
        };

        process.Start();
        process.BeginOutputReadLine();
        await process.WaitForExitAsync();

        if (process.ExitCode != 0)
        {
            var error = await process.StandardError.ReadToEndAsync();
            _logger.LogError($"Command '{command}' failed with error: {error}");
            throw new InvalidOperationException($"Command '{command}' failed with error: {error}");
        }

        return output;
    }
}
