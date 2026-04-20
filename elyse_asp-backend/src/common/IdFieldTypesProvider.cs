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
using Microsoft.Extensions.Logging;

/// <summary>
/// Provides configuration for ID field data types from CSV file.
/// Determines which ID fields should be converted to numeric types vs text types.
/// </summary>
public class IdFieldTypesProvider
{
    private readonly ILogger<IdFieldTypesProvider> _logger;
    private readonly HashSet<string> _numericFields;
    private readonly HashSet<string> _textFields;

    public IdFieldTypesProvider(ILogger<IdFieldTypesProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _numericFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        _textFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        LoadFieldTypes();
    }

    private void LoadFieldTypes()
    {
        try
        {
            // Path to the CSV file in the backend src/common folder
            var csvPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "common", "id-field-types.csv");
            
            // For development/debugging, also check relative path
            if (!File.Exists(csvPath))
            {
                csvPath = Path.Combine("src", "common", "id-field-types.csv");
            }
            
            if (!File.Exists(csvPath))
            {
                _logger.LogWarning($"ID field types CSV not found at: {csvPath}. Using empty mappings.");
                return;
            }

            var lines = File.ReadAllLines(csvPath);
            
            // Skip header row
            for (int i = 1; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (string.IsNullOrWhiteSpace(line))
                    continue;

                var parts = line.Split(',');
                if (parts.Length < 2)
                {
                    _logger.LogWarning($"Invalid line {i} in ID field types CSV: {line}");
                    continue;
                }

                var fieldName = parts[0].Trim();
                var dataType = parts[1].Trim().ToUpper();

                if (string.IsNullOrWhiteSpace(fieldName))
                    continue;

                // Categorize by data type
                if (dataType == "NUMBER")
                {
                    _numericFields.Add(fieldName);
                }
                else if (dataType == "TEXT")
                {
                    _textFields.Add(fieldName);
                }
            }

            _logger.LogInformation($"Loaded {_numericFields.Count + _textFields.Count} ID field type mappings ({_numericFields.Count} numeric, {_textFields.Count} text)");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading ID field types from CSV");
        }
    }

    /// <summary>
    /// Checks if the given field name should be converted to a numeric type.
    /// </summary>
    public bool IsNumericField(string fieldName)
    {
        return _numericFields.Contains(fieldName);
    }

    /// <summary>
    /// Checks if the given field name should remain as text.
    /// </summary>
    public bool IsTextField(string fieldName)
    {
        return _textFields.Contains(fieldName);
    }

    /// <summary>
    /// Gets all numeric field names.
    /// </summary>
    public IReadOnlyCollection<string> GetNumericFields()
    {
        return _numericFields;
    }
}
