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

using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Docnet.Core;
using Docnet.Core.Models;

namespace FileStorage.Services
{
    public class FileTextExtractionService
    {
        private readonly ILogger<FileTextExtractionService> _logger;
        private const int MaxTextLength = 1000000;// character limit

        // Magic number signatures for file type detection
        private static readonly Dictionary<string, byte[]> FileSignatures = new()
        {
            { "pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } }, // %PDF
            { "docx", new byte[] { 0x50, 0x4B, 0x03, 0x04 } }, // ZIP header (DOCX is ZIP-based)
        };

        public FileTextExtractionService(ILogger<FileTextExtractionService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Extracts and sanitizes text content from a file stream
        /// </summary>
        /// <param name="fileStream">The file content as a MemoryStream</param>
        /// <param name="fileName">The original filename (used for extension detection)</param>
        /// <returns>Sanitized text content or null if extraction fails/not applicable</returns>
        public async Task<string?> ExtractAndSanitizeTextContent(MemoryStream fileStream, string? fileName)
        {
            try
            {
                if (fileStream == null || fileStream.Length == 0)
                {
                    _logger.LogDebug("File stream is null or empty, skipping text extraction.");
                    return null;
                }

                // Reset stream position
                fileStream.Position = 0;
                var fileBytes = fileStream.ToArray();
                
                // Detect file type
                var fileType = DetectFileType(fileBytes, fileName);
                _logger.LogDebug($"Detected file type: {fileType} for file: {fileName}");

                string? extractedText = fileType switch
                {
                    "txt" or "csv" or "log" or "json" or "xml" or "html" or "css" or "js" or "ts" => ExtractPlainText(fileBytes),
                    "pdf" => await ExtractPdfText(fileBytes),
                    "docx" => ExtractWordText(fileBytes),
                    _ => null // Unsupported file type
                };

                if (string.IsNullOrEmpty(extractedText))
                {
                    _logger.LogDebug($"No text content extracted from file: {fileName}");
                    return null;
                }

                // Sanitize the extracted text
                var sanitizedText = SanitizeText(extractedText);
                _logger.LogInformation($"Successfully extracted and sanitized {sanitizedText.Length} characters from file: {fileName}");
                
                return sanitizedText;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Failed to extract text from file: {fileName}. File upload will continue without text content.");
                return null; // Never break file upload due to text extraction failure
            }
        }

        /// <summary>
        /// Detects file type based on extension and magic numbers
        /// </summary>
        private string DetectFileType(byte[] fileBytes, string? fileName)
        {
            // Try extension first
            if (!string.IsNullOrEmpty(fileName))
            {
                var extension = Path.GetExtension(fileName).ToLowerInvariant().TrimStart('.');
                if (!string.IsNullOrEmpty(extension))
                {
                    // Known text-based extensions
                    if (new[] { "txt", "csv", "log", "json", "xml", "html", "css", "js", "ts", "md", "yaml", "yml" }.Contains(extension))
                        return "txt";
                    
                    if (extension == "pdf" || extension == "docx")
                        return extension;
                }
            }

            // Fallback to magic number detection
            return DetectByMagicNumbers(fileBytes);
        }

        /// <summary>
        /// Detects file type by examining magic numbers (file signatures)
        /// </summary>
        private string DetectByMagicNumbers(byte[] fileBytes)
        {
            if (fileBytes.Length < 4) return "unknown";

            foreach (var signature in FileSignatures)
            {
                if (fileBytes.Take(signature.Value.Length).SequenceEqual(signature.Value))
                {
                    // For ZIP-based files, need additional checks
                    if (signature.Key == "docx")
                    {
                        return DetectOfficeFileType(fileBytes);
                    }
                    return signature.Key;
                }
            }

            // Check if it might be plain text
            if (IsLikelyTextFile(fileBytes))
                return "txt";

            return "unknown";
        }

        /// <summary>
        /// Detects DOCX files (ZIP-based)
        /// </summary>
        private string DetectOfficeFileType(byte[] fileBytes)
        {
            try
            {
                using var stream = new MemoryStream(fileBytes);
                using var archive = new System.IO.Compression.ZipArchive(stream, System.IO.Compression.ZipArchiveMode.Read);
                
                // Check for Word-specific files
                if (archive.Entries.Any(e => e.FullName.StartsWith("word/")))
                    return "docx";
            }
            catch
            {
                // If ZIP parsing fails, assume unknown
            }

            return "unknown";
        }

        /// <summary>
        /// Determines if file bytes represent a text file
        /// </summary>
        private bool IsLikelyTextFile(byte[] fileBytes)
        {
            if (fileBytes.Length == 0) return false;

            // Sample first 1KB to check for text characteristics
            var sampleSize = Math.Min(1024, fileBytes.Length);
            var sample = fileBytes.Take(sampleSize).ToArray();

            // Count printable characters
            int printableCount = 0;
            foreach (byte b in sample)
            {
                if ((b >= 32 && b <= 126) || b == 9 || b == 10 || b == 13) // Printable ASCII + tab, LF, CR
                    printableCount++;
            }

            // If more than 80% are printable characters, likely text
            return (double)printableCount / sample.Length > 0.8;
        }

        /// <summary>
        /// Extracts text from plain text files with encoding detection
        /// </summary>
        private string? ExtractPlainText(byte[] fileBytes)
        {
            try
            {
                // Try UTF-8 first
                var utf8Text = Encoding.UTF8.GetString(fileBytes);
                if (IsValidUtf8(fileBytes))
                    return utf8Text;

                // Try UTF-8 with BOM
                if (fileBytes.Length >= 3 && fileBytes[0] == 0xEF && fileBytes[1] == 0xBB && fileBytes[2] == 0xBF)
                    return Encoding.UTF8.GetString(fileBytes, 3, fileBytes.Length - 3);

                // Try UTF-16 LE
                if (fileBytes.Length >= 2 && fileBytes[0] == 0xFF && fileBytes[1] == 0xFE)
                    return Encoding.Unicode.GetString(fileBytes, 2, fileBytes.Length - 2);

                // Try UTF-16 BE
                if (fileBytes.Length >= 2 && fileBytes[0] == 0xFE && fileBytes[1] == 0xFF)
                    return Encoding.BigEndianUnicode.GetString(fileBytes, 2, fileBytes.Length - 2);

                // Fallback to ASCII/Latin-1
                return Encoding.GetEncoding("ISO-8859-1").GetString(fileBytes);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract plain text content.");
                return null;
            }
        }

        /// <summary>
        /// Validates if byte array represents valid UTF-8
        /// </summary>
        private bool IsValidUtf8(byte[] bytes)
        {
            try
            {
                var decoder = Encoding.UTF8.GetDecoder();
                decoder.Fallback = DecoderFallback.ExceptionFallback;
                var chars = new char[bytes.Length];
                decoder.GetChars(bytes, 0, bytes.Length, chars, 0, true);
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Extracts text from PDF files using Docnet.Core
        /// </summary>
        private async Task<string?> ExtractPdfText(byte[] fileBytes)
        {
            try
            {
                using var docReader = DocLib.Instance.GetDocReader(fileBytes, new PageDimensions());
                var textBuilder = new StringBuilder();

                for (int pageIndex = 0; pageIndex < docReader.GetPageCount(); pageIndex++)
                {
                    using var pageReader = docReader.GetPageReader(pageIndex);
                    var pageText = pageReader.GetText();
                    textBuilder.AppendLine(pageText);

                    // Prevent memory issues with very large PDFs
                    if (textBuilder.Length > MaxTextLength)
                        break;
                }

                return textBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract text from PDF.");
                return null;
            }
        }

        /// <summary>
        /// Extracts text from Word documents using DocumentFormat.OpenXml
        /// </summary>
        private string? ExtractWordText(byte[] fileBytes)
        {
            try
            {
                using var stream = new MemoryStream(fileBytes);
                using var doc = WordprocessingDocument.Open(stream, false);

                var body = doc.MainDocumentPart?.Document?.Body;
                if (body == null) return null;

                var textBuilder = new StringBuilder();
                foreach (var paragraph in body.Descendants<Paragraph>())
                {
                    textBuilder.AppendLine(paragraph.InnerText);

                    // Prevent memory issues
                    if (textBuilder.Length > MaxTextLength)
                        break;
                }

                return textBuilder.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract text from Word document.");
                return null;
            }
        }


        /// <summary>
        /// Sanitizes extracted text by removing harmful characters and limiting length
        /// </summary>
        private string SanitizeText(string text)
        {
            if (string.IsNullOrEmpty(text))
                return string.Empty;

            // Remove control characters except for common whitespace
            var sanitized = Regex.Replace(text, @"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", string.Empty);

            // Normalize line endings
            sanitized = Regex.Replace(sanitized, @"\r\n|\r|\n", "\n");

            // Remove excessive whitespace but preserve single line breaks
            sanitized = Regex.Replace(sanitized, @"[ \t]+", " ");
            sanitized = Regex.Replace(sanitized, @"\n{3,}", "\n\n");

            // Trim whitespace
            sanitized = sanitized.Trim();

            // Limit to maximum length (1 million characters as per stored procedure)
            if (sanitized.Length > MaxTextLength)
            {
                sanitized = sanitized.Substring(0, MaxTextLength);
                _logger.LogInformation($"Text content truncated to {MaxTextLength} characters.");
            }

            return sanitized;
        }
    }
}
