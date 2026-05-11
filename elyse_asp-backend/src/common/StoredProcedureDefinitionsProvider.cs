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
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using Microsoft.Extensions.Configuration;
using System.Reflection;

public class StoredProcedureDefinition
{
    public string Name { get; set; } = null!;
    public string ApplicationRole { get; set; } = null!;
    public Dictionary<string, Type> InputParameters { get; set; } = new Dictionary<string, Type>();
    public Dictionary<string, Type> OutputParameters { get; set; } = new Dictionary<string, Type>();
    public int ResultSets { get; set; }
}

public class StoredProcedureDefinitionsProvider
{
    private readonly IConfiguration _configuration;

    public StoredProcedureDefinitionsProvider(IConfiguration configuration)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public Dictionary<string, StoredProcedureDefinition> GetDefinitions()
    {
        var storedProcedureDefinitions = new Dictionary<string, StoredProcedureDefinition>();
        
        // Read from embedded resource instead of file
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = "stored_procedures.csv";
        
        using (var stream = assembly.GetManifestResourceStream(resourceName))
        {
            if (stream == null)
            {
                throw new InvalidOperationException($"Embedded resource '{resourceName}' not found. Make sure stored_procedures.csv is set as an EmbeddedResource in the project file.");
            }
            
            using (var reader = new StreamReader(stream))
            using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)))
            {
                var records = csv.GetRecords<StoredProcedureCsvRecord>();
                foreach (var record in records)
                {
                    var storedProcedureDefinition = new StoredProcedureDefinition
                    {
                        Name = record.Name,
                        ApplicationRole = record.ApplicationRole,
                        ResultSets = record.ResultSets
                    };

                    foreach (var inputParam in record.InputParameters.Split(';'))
                    {
                        var parts = inputParam.Split(':');
                        if (parts.Length == 2)
                        {
                            var paramName = parts[0];
                            var paramType = Type.GetType(parts[1]);
                            if (paramType != null)
                            {
                                storedProcedureDefinition.InputParameters[paramName] = paramType;
                            }
                        }
                    }

                    foreach (var outputParam in record.OutputParameters.Split(';'))
                    {
                        var parts = outputParam.Split(':');
                        if (parts.Length == 2)
                        {
                            var paramName = parts[0];
                            var paramType = Type.GetType(parts[1]);
                            if (paramType != null)
                            {
                                storedProcedureDefinition.OutputParameters[paramName] = paramType;
                            }
                        }
                    }

                    storedProcedureDefinitions[storedProcedureDefinition.Name] = storedProcedureDefinition;
                }
            }
        }

        return storedProcedureDefinitions;
    }
}

public class StoredProcedureCsvRecord
{
    public string Name { get; set; } = null!;
    public string ApplicationRole { get; set; } = null!;
    public string InputParameters { get; set; } = null!;
    public string OutputParameters { get; set; } = null!;
    public int ResultSets { get; set; }
}
