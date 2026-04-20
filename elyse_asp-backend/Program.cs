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
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting.WindowsServices;

public class Program
{
    public static void Main(string[] args)
    {
        // Load .env file - check both deployment and development locations
        string? envFilePath = null;
        
        // Try deployment location first (executable's directory for single-file deployment)
        var exeDirectory = Path.GetDirectoryName(Environment.ProcessPath!);
        var deploymentEnvPath = Path.Combine(exeDirectory!, ".env");
        
        if (File.Exists(deploymentEnvPath))
        {
            envFilePath = deploymentEnvPath;
        }
        else
        {
            // Fall back to current directory (for development)
            var devEnvPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
            if (File.Exists(devEnvPath))
            {
                envFilePath = devEnvPath;
            }
        }
        
        if (envFilePath != null)
        {
            // CRITICAL: Manual parsing to avoid DotNetEnv variable expansion issues
            // DotNetEnv by default parses $ as variable substitution which corrupts passwords
            // So we manually parse the .env file and set environment variables directly
            var lines = File.ReadAllLines(envFilePath);
            foreach (var line in lines)
            {
                // Skip comments and empty lines
                if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith("#"))
                    continue;
                
                // Parse KEY=VALUE format
                var parts = line.Split(new[] { '=' }, 2);
                if (parts.Length == 2)
                {
                    var key = parts[0].Trim();
                    var value = parts[1].Trim();
                    
                    // Set environment variable, overriding existing values
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
            
            Console.WriteLine($"Loaded .env from: {envFilePath}");
            Console.WriteLine($"DB_NAME from environment: {Environment.GetEnvironmentVariable("DB_NAME")}");
        }
        else
        {
            throw new FileNotFoundException($".env file not found. Checked: {deploymentEnvPath} and {Path.Combine(Directory.GetCurrentDirectory(), ".env")}");
        }
        
        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .UseWindowsService() // Enable Windows Service support
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.UseStartup<Startup>();
                
                // Configure server URLs from environment variable
                // Allows binding to specific interfaces (localhost vs all interfaces)
                var serverUrls = Environment.GetEnvironmentVariable("SERVER_URLS");
                if (!string.IsNullOrEmpty(serverUrls))
                {
                    Console.WriteLine($"Configuring server URLs: {serverUrls}");
                    webBuilder.UseUrls(serverUrls);
                }
                else
                {
                    Console.WriteLine("SERVER_URLS not set - using default (http://localhost:5000)");
                }
            });
}
