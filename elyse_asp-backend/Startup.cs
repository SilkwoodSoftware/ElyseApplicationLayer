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
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Server.IISIntegration;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using System.IO;
using System.Globalization;
using System.Text.Json;
using FileStorage.Services;

public class Startup
{
    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    public void ConfigureServices(IServiceCollection services)
    {
        // Register AutoMapper (required for controllers that inject IMapper)
        services.AddAutoMapper(cfg => {}, typeof(Program).Assembly);
        
        services.AddControllers()
            .AddApplicationPart(typeof(Program).Assembly) // CRITICAL: Explicit assembly for controller discovery in single-file deployment
            .AddJsonOptions(options =>
        {
            // Use null to preserve the original property names without any casing changes
            options.JsonSerializerOptions.PropertyNamingPolicy = null;
        });

        // Configure form options to allow large file uploads
        services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
        {
            options.ValueLengthLimit = int.MaxValue;
            options.MultipartBodyLengthLimit = int.MaxValue; // or set a specific limit like 500MB
            options.MultipartHeadersLengthLimit = int.MaxValue;
            options.MemoryBufferThreshold = int.MaxValue;
        });
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "elyse_asp_backend", Version = "v1" });
        });

        // Configure Windows Authentication for both Kestrel (Windows Service) and IIS
        // CRITICAL: Must use Negotiate authentication for Kestrel/Windows Service deployment
        // IIS authentication scheme alone does NOT work when running as Windows Service
        services.AddAuthentication(NegotiateDefaults.AuthenticationScheme)
            .AddNegotiate(); // Enables Windows Authentication via Kerberos/NTLM for Kestrel
        
        // Configure IIS options for Windows Authentication
        services.Configure<IISOptions>(iis =>
        {
            iis.AuthenticationDisplayName = "Windows";
            iis.AutomaticAuthentication = true; // Enable automatic authentication to capture Windows identity
        });
        
        services.AddSingleton<StoredProcedureDefinitionsProvider>();
        services.AddSingleton(provider => provider.GetRequiredService<StoredProcedureDefinitionsProvider>().GetDefinitions());
        
        // Load application role passwords once on startup (singleton)
        services.AddSingleton<ApplicationRolePasswordProvider>();
        
        // Load ID field type mappings once on startup (singleton)
        services.AddSingleton<IdFieldTypesProvider>();
        
        // DAL functionality is now integrated directly into the backend
        // No separate DAL process management needed
        
        // CRITICAL: StoredProcedureService must be SCOPED for KCD impersonation
        services.AddHttpContextAccessor(); // Required for KCD - get authenticated user
        services.AddScoped<StoredProcedureService>();
        
        // Services that depend on StoredProcedureService must also be SCOPED (cannot inject scoped into singleton)
        services.AddScoped<RolesByUserService>();
        services.AddScoped<ReadWindowsUsersAndGroupsService>();
        services.AddSingleton<ConnectionLimiter>(new ConnectionLimiter(50));
        services.AddSingleton<CircuitBreaker>();
        services.AddScoped<FileTextExtractionService>();
        services.AddScoped<IThumbnailGenerationService, ThumbnailGenerationService>();
        services.AddCors(options =>
        {
            options.AddPolicy("AllowAllOrigins",
                builder =>
                {
                    builder.AllowAnyOrigin()
                           .AllowAnyMethod()
                           .AllowAnyHeader();
                });
        });
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
            app.UseSwagger();
            app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "elyse_asp_backend v1"));
        }

        app.UseRouting();
        
        app.UseCors("AllowAllOrigins");
        app.UseAuthentication();
        app.UseAuthorization();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}
