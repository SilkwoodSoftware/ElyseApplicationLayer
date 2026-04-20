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
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Png;
using DocumentFormat.OpenXml.Packaging;
using System.Collections.Generic;
using System.Text;
using WordParagraph = DocumentFormat.OpenXml.Wordprocessing.Paragraph;
using Docnet.Core;
using Docnet.Core.Models;

namespace FileStorage.Services
{
    public class ThumbnailGenerationService : IThumbnailGenerationService
    {
        private readonly ILogger<ThumbnailGenerationService> _logger;
        
        // Supported image formats for direct processing
        private static readonly string[] SupportedImageExtensions = 
        {
            ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"
        };

        // File signatures for type detection
        private static readonly Dictionary<string, byte[]> FileSignatures = new()
        {
            { "pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 } }, // %PDF
            { "docx", new byte[] { 0x50, 0x4B, 0x03, 0x04 } }, // ZIP header
            { "jpg", new byte[] { 0xFF, 0xD8, 0xFF } },
            { "png", new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "gif", new byte[] { 0x47, 0x49, 0x46, 0x38 } },
            { "bmp", new byte[] { 0x42, 0x4D } },
        };

        public ThumbnailGenerationService(ILogger<ThumbnailGenerationService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<byte[]?> GenerateThumbnailAsync(byte[] fileContent, string fileName, int maxSize = 400)
        {
            if (fileContent == null || fileContent.Length == 0)
            {
                _logger.LogError("File content is null or empty for thumbnail generation of file: {fileName}", fileName);
                return null;
            }

            _logger.LogInformation("Starting thumbnail generation for file: {fileName}, Size: {Size} bytes", fileName, fileContent.Length);

            var fileType = DetectFileType(fileContent, fileName);
            _logger.LogInformation("Detected file type: {FileType} for file: {fileName}", fileType, fileName);

            var result = fileType switch
            {
                "pdf" => await GeneratePdfThumbnailAsync(fileContent, maxSize),
                "docx" => await GenerateDocxThumbnailAsync(fileContent, maxSize),
                "jpg" or "jpeg" or "png" or "gif" or "bmp" or "tiff" or "webp"
                    => await GenerateImageThumbnailAsync(fileContent, maxSize),
                _ => await HandleUnsupportedFileTypeAsync(fileType, fileName, maxSize)
            };

            _logger.LogInformation("Thumbnail generation completed for file: {fileName}. Result size: {Size} bytes",
                fileName, result?.Length ?? 0);
            
            return result;
        }

        private string DetectFileType(byte[] fileBytes, string fileName)
        {
            _logger.LogDebug("Detecting file type for: {fileName}", fileName);
            
            // Try extension first
            if (!string.IsNullOrEmpty(fileName))
            {
                var extension = Path.GetExtension(fileName).ToLowerInvariant();
                _logger.LogDebug("File extension detected: '{Extension}' for file: {fileName}", extension, fileName);
                
                if (SupportedImageExtensions.Contains(extension))
                {
                    var fileType = extension.TrimStart('.');
                    _logger.LogInformation("File type detected by extension: {FileType} for file: {fileName}", fileType, fileName);
                    return fileType;
                }
                
                if (extension == ".pdf")
                {
                    _logger.LogInformation("File type detected as PDF by extension for file: {fileName}", fileName);
                    return "pdf";
                }
                if (extension == ".docx")
                {
                    _logger.LogInformation("File type detected as DOCX by extension for file: {fileName}", fileName);
                    return "docx";
                }
            }

            // Fallback to magic number detection
            _logger.LogDebug("Using magic number detection for file: {fileName}", fileName);
            var magicType = DetectByMagicNumbers(fileBytes);
            _logger.LogInformation("File type detected by magic numbers: {FileType} for file: {fileName}", magicType, fileName);
            return magicType;
        }

        private string DetectByMagicNumbers(byte[] fileBytes)
        {
            if (fileBytes.Length < 4) return "unknown";

            foreach (var signature in FileSignatures)
            {
                if (fileBytes.Take(signature.Value.Length).SequenceEqual(signature.Value))
                {
                    // For ZIP-based files (DOCX), need additional check
                    if (signature.Key == "docx")
                    {
                        return DetectOfficeFileType(fileBytes);
                    }
                    return signature.Key;
                }
            }

            return "unknown";
        }

        private string DetectOfficeFileType(byte[] fileBytes)
        {
            try
            {
                using var stream = new MemoryStream(fileBytes);
                using var archive = new System.IO.Compression.ZipArchive(stream, System.IO.Compression.ZipArchiveMode.Read);
                
                if (archive.Entries.Any(e => e.FullName.StartsWith("word/")))
                    return "docx";
            }
            catch
            {
                // If ZIP parsing fails, assume unknown
            }

            return "unknown";
        }

        private async Task<byte[]?> GenerateImageThumbnailAsync(byte[] imageData, int maxSize)
        {
            _logger.LogInformation("Starting image thumbnail generation. Image size: {Size} bytes, Max size: {MaxSize}px",
                imageData.Length, maxSize);
            
            using var image = Image.Load(imageData);
            _logger.LogInformation("Successfully loaded image. Dimensions: {Width}x{Height}", image.Width, image.Height);
            
            // Calculate new dimensions maintaining aspect ratio
            var (newWidth, newHeight) = CalculateNewDimensions(image.Width, image.Height, maxSize);
            _logger.LogInformation("Calculated thumbnail dimensions: {NewWidth}x{NewHeight}", newWidth, newHeight);
            
            // Resize the image
            image.Mutate(x => x.Resize(newWidth, newHeight));
            
            // Convert to PNG for consistent output
            using var outputStream = new MemoryStream();
            await image.SaveAsync(outputStream, new PngEncoder());
            
            var thumbnailBytes = outputStream.ToArray();
            _logger.LogInformation("Generated image thumbnail: {Width}x{Height}, Output size: {OutputSize} bytes",
                newWidth, newHeight, thumbnailBytes.Length);
            
            return thumbnailBytes;
        }

        private async Task<byte[]?> GeneratePdfThumbnailAsync(byte[] pdfData, int maxSize)
        {
            _logger.LogInformation("Starting PDF page rendering. PDF size: {Size} bytes, Target size: {MaxSize}px on long side", pdfData.Length, maxSize);
            
            try
            {
                using var docLib = DocLib.Instance;
                
                // Get page dimensions - use safe equal dimensions for initial read
                using var tempDocument = docLib.GetDocReader(pdfData, new PageDimensions(100, 100));
                var pageCount = tempDocument.GetPageCount();
                
                if (pageCount == 0)
                {
                    _logger.LogWarning("PDF contains no pages");
                    return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.Orange);
                }
                
                using var tempPageReader = tempDocument.GetPageReader(0);
                var pageWidth = tempPageReader.GetPageWidth();
                var pageHeight = tempPageReader.GetPageHeight();
                
                _logger.LogInformation("PDF page dimensions: {Width}x{Height} points", pageWidth, pageHeight);
                
                // Calculate target dimensions - maxSize on the long side
                var (targetWidth, targetHeight) = CalculateNewDimensions((int)pageWidth, (int)pageHeight, maxSize);
                
                _logger.LogInformation("Target render dimensions: {Width}x{Height} pixels", targetWidth, targetHeight);
                
                // Render PDF directly at target size - PageDimensions expects smaller dimension first
                var (dimOne, dimTwo) = targetWidth <= targetHeight ? (targetWidth, targetHeight) : (targetHeight, targetWidth);
                using var pdfDocument = docLib.GetDocReader(pdfData, new PageDimensions(dimOne, dimTwo));
                using var pageReader = pdfDocument.GetPageReader(0);
                
                var renderBytes = pageReader.GetImage();
                
                if (renderBytes == null || renderBytes.Length == 0)
                {
                    _logger.LogError("PDF rendering returned null or empty data");
                    return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.Orange);
                }
                
                // Find actual dimensions from rendered bytes
                var (actualWidth, actualHeight) = FindActualDimensions(renderBytes.Length, targetWidth, targetHeight);
                
                _logger.LogInformation("PDF rendered at {ActualW}x{ActualH} ({ActualBytes} bytes)",
                    actualWidth, actualHeight, renderBytes.Length);
                
                // Convert BGRA bytes to PNG - store exactly as rendered, no additional scaling
                using var image = SixLabors.ImageSharp.Image.LoadPixelData<SixLabors.ImageSharp.PixelFormats.Bgra32>(
                    renderBytes, actualWidth, actualHeight);
                
                using var outputStream = new MemoryStream();
                await image.SaveAsync(outputStream, new SixLabors.ImageSharp.Formats.Png.PngEncoder());
                
                var result = outputStream.ToArray();
                _logger.LogInformation("Generated PDF thumbnail: {Width}x{Height}, PNG size: {Size} bytes (stored and displayed 1:1)",
                    actualWidth, actualHeight, result.Length);
                
                return result;
            }
            catch (System.DllNotFoundException ex)
            {
                _logger.LogError(ex, "PDFium native library not found: {Message}", ex.Message);
                return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.Red);
            }
            catch (System.BadImageFormatException ex)
            {
                _logger.LogError(ex, "PDFium native library architecture mismatch: {Message}", ex.Message);
                return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.Red);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PDF rendering failed: {ExceptionType}: {Message}", ex.GetType().Name, ex.Message);
                return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.IndianRed);
            }
        }

        private async Task<byte[]> ConvertRenderBytesToPng(byte[] renderBytes, int renderWidth, int renderHeight, int targetWidth, int targetHeight)
        {
            if (renderBytes == null || renderBytes.Length == 0)
            {
                _logger.LogError("PDF rendering returned null or empty byte array");
                throw new InvalidOperationException("PDF rendering returned no data");
            }
            
            var expectedByteCount = renderWidth * renderHeight * 4; // BGRA = 4 bytes per pixel
            if (renderBytes.Length != expectedByteCount)
            {
                _logger.LogWarning("Render bytes length mismatch. Expected: {Expected}, Actual: {Actual}",
                    expectedByteCount, renderBytes.Length);
            }
            
            _logger.LogInformation("Converting PDF render bytes to PNG: {RenderWidth}x{RenderHeight} -> {TargetWidth}x{TargetHeight}",
                renderWidth, renderHeight, targetWidth, targetHeight);
            
            // Convert BGRA bytes to Image using ImageSharp
            using var image = SixLabors.ImageSharp.Image.LoadPixelData<SixLabors.ImageSharp.PixelFormats.Bgra32>(
                renderBytes, renderWidth, renderHeight);
            
            // Resize to target dimensions if different
            if (renderWidth != targetWidth || renderHeight != targetHeight)
            {
                image.Mutate(x => x.Resize(targetWidth, targetHeight));
            }
            
            using var outputStream = new MemoryStream();
            await image.SaveAsync(outputStream, new SixLabors.ImageSharp.Formats.Png.PngEncoder());
            
            var result = outputStream.ToArray();
            _logger.LogInformation("Successfully converted PDF to PNG thumbnail: {Width}x{Height}, Size: {Size} bytes",
                targetWidth, targetHeight, result.Length);
            
            return result;
        }

        private async Task<byte[]?> GenerateDocxThumbnailAsync(byte[] docxData, int maxSize)
        {
            _logger.LogInformation("Starting DOCX thumbnail generation using self-contained renderer. DOCX size: {Size} bytes", docxData.Length);
            
            try
            {
                // Extract document content and structure using existing OpenXML library
                var documentContent = ExtractDocxDocumentStructure(docxData);
                
                // Render as a realistic document page image
                return await RenderDocxAsDocumentPageAsync(documentContent, maxSize);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate DOCX thumbnail: {Message}", ex.Message);
                return await CreateDocumentStyleThumbnailAsync(maxSize, true);
            }
        }

        private DocxDocumentStructure ExtractDocxDocumentStructure(byte[] docxData)
        {
            var document = new DocxDocumentStructure();
            
            try
            {
                using var stream = new MemoryStream(docxData);
                using var wordDocument = WordprocessingDocument.Open(stream, false);
                
                var body = wordDocument.MainDocumentPart?.Document?.Body;
                if (body == null)
                {
                    _logger.LogWarning("DOCX document has no body content");
                    return document;
                }
                
                // Extract paragraphs with better formatting detection
                var paragraphs = body.Elements<WordParagraph>();
                
                foreach (var paragraph in paragraphs.Take(30)) // Get more content for realistic appearance
                {
                    var text = paragraph.InnerText?.Trim();
                    if (string.IsNullOrEmpty(text)) continue;
                    
                    var docPara = new DocxDocumentParagraph
                    {
                        Text = text,
                        IsHeading = IsHeadingParagraph(paragraph),
                        IsBold = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.Bold>().Any(),
                        IsItalic = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.Italic>().Any(),
                        IndentLevel = GetIndentLevel(paragraph),
                        FontSize = GetFontSize(paragraph)
                    };
                    
                    document.Paragraphs.Add(docPara);
                }
                
                _logger.LogInformation("Extracted {ParagraphCount} paragraphs from DOCX for rendering", document.Paragraphs.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting DOCX structure: {Message}", ex.Message);
            }
            
            return document;
        }

        private bool IsHeadingParagraph(WordParagraph paragraph)
        {
            // Check style-based headings
            var styleId = paragraph.ParagraphProperties?.ParagraphStyleId?.Val?.Value;
            if (!string.IsNullOrEmpty(styleId) && styleId.Contains("Heading"))
                return true;
            
            // Check formatting-based headings (large font, bold)
            var runProps = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.RunProperties>().FirstOrDefault();
            if (runProps != null)
            {
                var fontSize = runProps.FontSize?.Val?.Value;
                var isBold = runProps.Bold != null;
                
                // Consider it a heading if it's bold and larger than normal text
                if (isBold && fontSize != null && int.TryParse(fontSize, out int size) && size >= 24) // 12pt = 24 half-points
                    return true;
            }
            
            return false;
        }

        private int GetIndentLevel(WordParagraph paragraph)
        {
            var indentValue = paragraph.ParagraphProperties?.Indentation?.Left?.Value;
            if (indentValue != null && int.TryParse(indentValue, out int indent))
            {
                // Convert twips to indent levels (rough approximation)
                return Math.Min(indent / 720, 3); // 720 twips ≈ 0.5 inch
            }
            return 0;
        }

        private int GetFontSize(WordParagraph paragraph)
        {
            var runProps = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.RunProperties>().FirstOrDefault();
            var fontSize = runProps?.FontSize?.Val?.Value;
            
            if (fontSize != null && int.TryParse(fontSize, out int size))
            {
                return size / 2; // Convert half-points to points
            }
            
            return 12; // Default font size
        }

        private async Task<byte[]> RenderDocxAsDocumentPageAsync(DocxDocumentStructure documentContent, int maxSize)
        {
            try
            {
                var width = maxSize;
                var height = (int)(maxSize / 0.7); // A4 proportions
                
                _logger.LogInformation("Rendering DOCX as document page: {Width}x{Height}", width, height);
                
                using var image = new Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);
                
                // White document background
                image.Mutate(x => x.BackgroundColor(Color.White));
                
                // Add subtle document shadow/border
                DrawDocumentBorder(image, width, height);
                
                // Render document content realistically
                if (documentContent.Paragraphs.Any())
                {
                    RenderRealisticDocumentContent(image, documentContent, width, height);
                }
                else
                {
                    DrawEmptyDocumentMessage(image, width, height);
                }
                
                using var outputStream = new MemoryStream();
                await image.SaveAsync(outputStream, new PngEncoder());
                
                var result = outputStream.ToArray();
                _logger.LogInformation("Generated DOCX document page thumbnail: {Width}x{Height}, Size: {Size} bytes",
                    width, height, result.Length);
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rendering DOCX as document page: {Message}", ex.Message);
                return await CreateDocumentStyleThumbnailAsync(maxSize, true);
            }
        }

        private void RenderRealisticDocumentContent(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image,
            DocxDocumentStructure content, int width, int height)
        {
            var margin = 40; // Document margins
            var currentY = margin + 20; // Start position
            var lineSpacing = 18; // Space between lines
            var paragraphSpacing = 8; // Extra space between paragraphs
            var maxTextWidth = width - (margin * 2);
            
            foreach (var paragraph in content.Paragraphs)
            {
                if (currentY >= height - margin - 20) break; // Don't exceed page bounds
                
                // Calculate paragraph styling
                var fontSize = paragraph.IsHeading ? 16 : (paragraph.FontSize > 12 ? paragraph.FontSize : 12);
                var lineHeight = (int)(fontSize * 1.2); // Line height based on font size
                var indent = paragraph.IndentLevel * 20; // Indent pixels
                
                // Render paragraph text realistically
                currentY = RenderParagraphText(image, paragraph, margin + indent, currentY, maxTextWidth - indent, lineHeight);
                
                // Add spacing after paragraph
                currentY += (paragraph.IsHeading ? paragraphSpacing * 2 : paragraphSpacing);
            }
        }

        private int RenderParagraphText(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, DocxDocumentParagraph paragraph,
            int startX, int startY, int maxWidth, int lineHeight)
        {
            var textColor = new SixLabors.ImageSharp.PixelFormats.Rgba32(20, 20, 20, 255); // Near-black
            
            // Calculate text metrics
            var charWidth = paragraph.IsHeading ? 4 : 3; // Approximate character width in pixels
            var words = paragraph.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            
            var currentY = startY;
            var currentX = startX;
            var currentLineLength = 0;
            
            foreach (var word in words)
            {
                var wordLength = word.Length * charWidth + charWidth; // Add space
                
                // Check if word fits on current line
                if (currentLineLength + wordLength > maxWidth && currentLineLength > 0)
                {
                    // Move to next line
                    currentY += lineHeight;
                    currentX = startX;
                    currentLineLength = 0;
                    
                    if (currentY >= image.Height - 20) break; // Don't exceed image bounds
                }
                
                // Draw word as realistic text-like pattern
                DrawRealisticWord(image, word, currentX, currentY, charWidth, lineHeight, textColor, paragraph.IsBold);
                
                currentX += wordLength;
                currentLineLength += wordLength;
            }
            
            return currentY + lineHeight; // Return next available Y position
        }

        private void DrawRealisticWord(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, string word,
            int x, int y, int charWidth, int lineHeight, SixLabors.ImageSharp.PixelFormats.Rgba32 color, bool isBold)
        {
            var thickness = isBold ? 2 : 1;
            var charHeight = (int)(lineHeight * 0.7); // Text doesn't fill entire line height
            var baselineOffset = (int)(lineHeight * 0.2); // Offset from top to simulate baseline
            
            for (int i = 0; i < word.Length; i++)
            {
                var charX = x + (i * charWidth);
                var char_c = word[i];
                
                // Draw character as pattern based on the actual character
                DrawCharacterPattern(image, char_c, charX, y + baselineOffset, charWidth, charHeight, color, thickness);
            }
        }

        private void DrawCharacterPattern(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, char character,
            int x, int y, int width, int height, SixLabors.ImageSharp.PixelFormats.Rgba32 color, int thickness)
        {
            // Create different patterns for different character types to make it look more realistic
            if (char.IsUpper(character))
            {
                // Uppercase letters - fuller pattern
                DrawCharPattern(image, x, y, width, height, color, thickness, 0.8);
            }
            else if (char.IsLower(character))
            {
                // Lowercase letters - varies by character
                var heightRatio = GetLowercaseHeightRatio(character);
                var yOffset = character is 'g' or 'j' or 'p' or 'q' or 'y' ? height / 4 : 0; // Descenders
                DrawCharPattern(image, x, y + yOffset, width, (int)(height * heightRatio), color, thickness, heightRatio);
            }
            else if (char.IsDigit(character))
            {
                // Numbers
                DrawCharPattern(image, x, y, width, height, color, thickness, 0.9);
            }
            else if (char.IsPunctuation(character))
            {
                // Punctuation - smaller patterns
                DrawCharPattern(image, x, y + height / 2, width, height / 3, color, thickness, 0.5);
            }
            else
            {
                // Default pattern
                DrawCharPattern(image, x, y, width, height, color, thickness, 0.6);
            }
        }

        private double GetLowercaseHeightRatio(char c)
        {
            // Tall letters
            if (c is 'b' or 'd' or 'f' or 'h' or 'k' or 'l' or 't') return 0.9;
            // Letters with descenders
            if (c is 'g' or 'j' or 'p' or 'q' or 'y') return 0.8;
            // Regular lowercase
            return 0.6;
        }

        private void DrawCharPattern(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, int x, int y, int width, int height,
            SixLabors.ImageSharp.PixelFormats.Rgba32 color, int thickness, double density)
        {
            var pixelsToFill = (int)(width * height * density);
            var filled = 0;
            
            for (int py = y; py < y + height && py < image.Height && filled < pixelsToFill; py += thickness)
            {
                for (int px = x; px < x + width && px < image.Width && filled < pixelsToFill; px++)
                {
                    // Create varied pattern - not solid blocks
                    if ((px + py) % 3 != 0) // Skip some pixels for texture
                    {
                        for (int t = 0; t < thickness && py + t < image.Height; t++)
                        {
                            image[px, py + t] = color;
                        }
                        filled++;
                    }
                }
            }
        }

        private async Task<byte[]> RenderDocxContentAsync(byte[] docxData, int maxSize)
        {
            try
            {
                _logger.LogInformation("Starting advanced DOCX content rendering");
                
                using var stream = new MemoryStream(docxData);
                using var document = WordprocessingDocument.Open(stream, false);
                
                var body = document.MainDocumentPart?.Document?.Body;
                if (body == null)
                {
                    _logger.LogWarning("DOCX document has no body, creating empty document thumbnail");
                    return await CreateDocumentStyleThumbnailAsync(maxSize, true);
                }
                
                // Extract text content and basic formatting
                var contentData = ExtractDocxContentWithFormatting(document);
                
                // Render the content as an image
                return await RenderDocxTextToImageAsync(contentData, maxSize);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rendering DOCX content: {Message}", ex.Message);
                return await CreateDocumentStyleThumbnailAsync(maxSize, true);
            }
        }

        private DocxContentData ExtractDocxContentWithFormatting(WordprocessingDocument document)
        {
            var content = new DocxContentData();
            
            try
            {
                var body = document.MainDocumentPart?.Document?.Body;
                if (body == null) return content;
                
                var paragraphs = body.Elements<WordParagraph>().Take(20); // First 20 paragraphs
                
                foreach (var paragraph in paragraphs)
                {
                    var paragraphText = paragraph.InnerText?.Trim();
                    if (!string.IsNullOrEmpty(paragraphText))
                    {
                        // Basic formatting detection
                        var isBold = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.Bold>().Any();
                        var isItalic = paragraph.Descendants<DocumentFormat.OpenXml.Wordprocessing.Italic>().Any();
                        
                        // Try to detect if it's a heading based on font size or style
                        var isHeading = paragraph.ParagraphProperties?.ParagraphStyleId?.Val?.Value?.Contains("Heading") == true;
                        
                        content.Paragraphs.Add(new DocxParagraph
                        {
                            Text = paragraphText,
                            IsBold = isBold,
                            IsItalic = isItalic,
                            IsHeading = isHeading
                        });
                    }
                }
                
                _logger.LogInformation("Extracted {ParagraphCount} paragraphs from DOCX", content.Paragraphs.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting DOCX content with formatting");
            }
            
            return content;
        }

        private async Task<byte[]> RenderDocxTextToImageAsync(DocxContentData content, int maxSize)
        {
            try
            {
                // Use full maxSize for better quality - no scaling needed
                var width = maxSize;
                var height = (int)(maxSize / 0.7); // A4 proportions
                
                _logger.LogInformation("Creating DOCX thumbnail at full size: {Width}x{Height}", width, height);
                
                using var image = new Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);
                
                // White document background
                image.Mutate(x => x.BackgroundColor(Color.White));
                
                // Add document border
                DrawDocumentBorder(image, width, height);
                
                // Render actual text content
                if (content.Paragraphs.Any())
                {
                    RenderImprovedTextContent(image, content, width, height);
                }
                else
                {
                    // If no content, show "Empty Document" message
                    DrawEmptyDocumentMessage(image, width, height);
                }
                
                using var outputStream = new MemoryStream();
                await image.SaveAsync(outputStream, new PngEncoder());
                
                var result = outputStream.ToArray();
                _logger.LogInformation("Generated DOCX thumbnail with actual content: {Width}x{Height}, Size: {Size} bytes", width, height, result.Length);
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rendering DOCX text to image");
                return await CreateDocumentStyleThumbnailAsync(maxSize, true);
            }
        }

        private void DrawDocumentBorder(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, int width, int height)
        {
            var borderColor = new SixLabors.ImageSharp.PixelFormats.Rgba32(200, 200, 200, 255);
            var borderWidth = 1;
            
            // Top and bottom borders
            for (int x = 0; x < width; x++)
            {
                for (int i = 0; i < borderWidth; i++)
                {
                    if (i < height) image[x, i] = borderColor;
                    if (height - 1 - i >= 0) image[x, height - 1 - i] = borderColor;
                }
            }
            
            // Left and right borders
            for (int y = 0; y < height; y++)
            {
                for (int i = 0; i < borderWidth; i++)
                {
                    if (i < width) image[i, y] = borderColor;
                    if (width - 1 - i >= 0) image[width - 1 - i, y] = borderColor;
                }
            }
        }

        private void RenderImprovedTextContent(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, DocxContentData content, int width, int height)
        {
            var margin = 30; // Increased margin for better appearance
            var currentY = margin + 15;
            var normalLineHeight = 16;
            var headingLineHeight = 22;
            var maxTextWidth = width - (margin * 2);
            
            foreach (var paragraph in content.Paragraphs.Take(20)) // Show more paragraphs
            {
                var lineHeight = paragraph.IsHeading ? headingLineHeight : normalLineHeight;
                
                if (currentY + lineHeight >= height - margin) break; // Don't exceed image bounds
                
                // Render paragraph text as readable lines instead of solid blocks
                RenderParagraphAsLines(image, paragraph, margin, currentY, maxTextWidth, lineHeight);
                
                currentY += lineHeight + (paragraph.IsHeading ? 12 : 6); // Extra spacing after headings
            }
        }

        private void RenderParagraphAsLines(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, DocxParagraph paragraph,
            int startX, int y, int maxWidth, int lineHeight)
        {
            var textColor = new SixLabors.ImageSharp.PixelFormats.Rgba32(40, 40, 40, 255); // Dark gray, easier to read than pure black
            var lightColor = new SixLabors.ImageSharp.PixelFormats.Rgba32(120, 120, 120, 255); // Lighter for variety
            
            // Calculate how many "text lines" we can fit based on text length
            var charWidth = paragraph.IsHeading ? 3 : 2; // Character width simulation
            var wordsPerLine = maxWidth / (charWidth * 8); // Approximate words per line
            var words = paragraph.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var totalLines = Math.Max(1, (int)Math.Ceiling((double)words.Length / wordsPerLine));
            
            // Limit lines to prevent overflow
            totalLines = Math.Min(totalLines, 3);
            
            for (int line = 0; line < totalLines; line++)
            {
                var lineY = y + (line * (lineHeight / totalLines + 2));
                if (lineY >= image.Height - 10) break;
                
                // Calculate line width (shorter for last lines, random variation)
                var isLastLine = line == totalLines - 1;
                var lineWidth = isLastLine ?
                    (int)(maxWidth * 0.6) : // Last line is shorter
                    (int)(maxWidth * (0.8 + (line % 3) * 0.1)); // Vary line lengths
                
                // Draw multiple thin horizontal lines to simulate text characters
                DrawTextLines(image, startX, lineY, lineWidth, paragraph.IsBold ? 3 : 2, textColor, lightColor);
            }
        }

        private void DrawTextLines(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, int x, int y, int width, int thickness,
            SixLabors.ImageSharp.PixelFormats.Rgba32 primaryColor, SixLabors.ImageSharp.PixelFormats.Rgba32 secondaryColor)
        {
            // Draw main text line
            for (int px = x; px < x + width && px < image.Width; px++)
            {
                for (int py = y; py < y + thickness && py < image.Height; py++)
                {
                    // Add some variation to make it look more like text
                    var useSecondary = (px + py) % 7 == 0; // Add some texture
                    image[px, py] = useSecondary ? secondaryColor : primaryColor;
                }
            }
            
            // Add small gaps to simulate spaces between words
            var wordSpacing = width / 8; // Approximate words per line
            for (int gap = wordSpacing; gap < width; gap += wordSpacing)
            {
                var gapX = x + gap;
                if (gapX < image.Width && gapX + 3 < x + width)
                {
                    for (int py = y; py < y + thickness && py < image.Height; py++)
                    {
                        for (int px = gapX; px < gapX + 3 && px < image.Width; px++)
                        {
                            image[px, py] = new SixLabors.ImageSharp.PixelFormats.Rgba32(255, 255, 255, 255); // White gap
                        }
                    }
                }
            }
        }


        private void DrawEmptyDocumentMessage(Image<SixLabors.ImageSharp.PixelFormats.Rgba32> image, int width, int height)
        {
            var centerX = width / 2;
            var centerY = height / 2;
            var messageWidth = 120;
            var messageHeight = 6;
            var textColor = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255); // Gray text
            
            // Draw "Empty Document" indicator as textured lines
            DrawTextLines(image, centerX - messageWidth / 2, centerY - messageHeight / 2, messageWidth, messageHeight, textColor, textColor);
        }

        private bool ExtractDocxText(byte[] docxData)
        {
            try
            {
                using var stream = new MemoryStream(docxData);
                using var document = WordprocessingDocument.Open(stream, false);
                
                var body = document.MainDocumentPart?.Document?.Body;
                if (body == null) return false;
                
                // Check if document has any text content
                var paragraphs = body.Elements<WordParagraph>();
                foreach (var paragraph in paragraphs.Take(5)) // Check first 5 paragraphs
                {
                    var paragraphText = paragraph.InnerText?.Trim();
                    if (!string.IsNullOrEmpty(paragraphText))
                    {
                        return true; // Found content
                    }
                }
                
                return false; // No content found
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting text from DOCX");
                return false;
            }
        }

        private async Task<byte[]> CreateDocumentStyleThumbnailAsync(int maxSize, bool isEmpty = false)
        {
            try
            {
                // Create document-like thumbnail with A4 proportions (width:height ≈ 0.7)
                var width = maxSize;
                var height = (int)(maxSize / 0.7);
                
                using var image = new Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);
                
                // White document background
                image.Mutate(x => x.BackgroundColor(Color.White));
                
                // Create document-like appearance with lines simulating text
                var margin = 20;
                var lineHeight = 8;
                var lineSpacing = 12;
                var startY = margin + 20;
                
                // Add some horizontal lines to simulate text content
                if (!isEmpty)
                {
                    for (int i = 0; i < (height - margin * 2 - 20) / lineSpacing && i < 25; i++)
                    {
                        var y = startY + (i * lineSpacing);
                        var lineWidth = i % 4 == 3 ? width - margin * 3 : width - margin * 2; // Shorter lines occasionally
                        
                        // Draw line by filling a thin rectangle
                        for (int x = margin; x < lineWidth; x++)
                        {
                            if (y < height - margin && x < width - margin)
                            {
                                for (int ly = y; ly < y + 2 && ly < height - margin; ly++)
                                {
                                    image[x, ly] = new SixLabors.ImageSharp.PixelFormats.Rgba32(100, 100, 100, 255); // Gray text lines
                                }
                            }
                        }
                    }
                }
                
                // Add document border
                // Top border
                for (int x = 0; x < width; x++)
                {
                    image[x, 0] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                    image[x, 1] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                }
                // Bottom border
                for (int x = 0; x < width; x++)
                {
                    image[x, height - 1] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                    image[x, height - 2] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                }
                // Left border
                for (int y = 0; y < height; y++)
                {
                    image[0, y] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                    image[1, y] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                }
                // Right border
                for (int y = 0; y < height; y++)
                {
                    image[width - 1, y] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                    image[width - 2, y] = new SixLabors.ImageSharp.PixelFormats.Rgba32(150, 150, 150, 255);
                }
                
                using var outputStream = new MemoryStream();
                await image.SaveAsync(outputStream, new PngEncoder());
                
                var result = outputStream.ToArray();
                _logger.LogInformation("Created DOCX document-style thumbnail: {Width}x{Height}, Size: {Size} bytes", width, height, result.Length);
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create document-style thumbnail, falling back to simple placeholder");
                return await CreatePlaceholderImageAsync(maxSize, maxSize, Color.LightBlue);
            }
        }

        private async Task<byte[]?> HandleUnsupportedFileTypeAsync(string fileType, string fileName, int maxSize)
        {
            _logger.LogWarning("Unsupported file type '{FileType}' for thumbnail generation of file: {fileName}. Returning null to continue upload process.", fileType, fileName);
            
            // Return null instead of throwing exception to allow file upload to continue
            // The file will be uploaded successfully but without a thumbnail
            return null;
        }

        private async Task<byte[]> CreatePlaceholderImageAsync(int width, int height, Color backgroundColor)
        {
            try
            {
                using var image = new Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(width, height);
                
                // Fill with specified background color
                image.Mutate(x => x.BackgroundColor(backgroundColor));
                
                using var outputStream = new MemoryStream();
                await image.SaveAsync(outputStream, new PngEncoder());
                return outputStream.ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create placeholder image");
                // Return minimal PNG placeholder
                return CreateMinimalPngPlaceholder();
            }
        }

        private byte[] CreateMinimalPngPlaceholder()
        {
            // Minimal 1x1 transparent PNG (base64 decoded)
            // This is a fallback if all else fails
            return Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==");
        }

        private static (int width, int height) CalculateNewDimensions(int originalWidth, int originalHeight, int maxSize)
        {
            double ratio = (double)originalWidth / originalHeight;
            
            // Always scale to maxSize on the longest side (scale both up and down)
            if (originalWidth > originalHeight)
            {
                // Width is longer - scale width to maxSize
                return (maxSize, (int)(maxSize / ratio));
            }
            else
            {
                // Height is longer - scale height to maxSize
                return ((int)(maxSize * ratio), maxSize);
            }
        }

        private (int width, int height) FindActualDimensions(int byteLength, int expectedWidth, int expectedHeight)
        {
            var totalPixels = byteLength / 4;
            
            // Try the expected dimensions first
            if (expectedWidth * expectedHeight == totalPixels)
            {
                return (expectedWidth, expectedHeight);
            }
            
            // Search around the expected dimensions
            var aspectRatio = (double)expectedWidth / expectedHeight;
            
            // Try dimensions within ±10 pixels of expected
            for (int deltaW = -10; deltaW <= 10; deltaW++)
            {
                for (int deltaH = -10; deltaH <= 10; deltaH++)
                {
                    var testW = expectedWidth + deltaW;
                    var testH = expectedHeight + deltaH;
                    
                    if (testW > 0 && testH > 0 && testW * testH == totalPixels)
                    {
                        return (testW, testH);
                    }
                }
            }
            
            // If exact match not found, calculate from aspect ratio
            var height = (int)Math.Sqrt(totalPixels / aspectRatio);
            var width = totalPixels / height;
            
            // Verify this gives exact pixel count
            if (width * height == totalPixels)
            {
                return (width, height);
            }
            
            // Last resort - try nearby values
            for (int delta = -2; delta <= 2; delta++)
            {
                var testH = height + delta;
                if (testH > 0 && totalPixels % testH == 0)
                {
                    var testW = totalPixels / testH;
                    return (testW, testH);
                }
            }
            
            // Should not reach here, but return best guess
            return (width, height);
        }
    }

    // Helper classes for DOCX content processing
    public class DocxContentData
    {
        public List<DocxParagraph> Paragraphs { get; set; } = new List<DocxParagraph>();
    }

    public class DocxParagraph
    {
        public string Text { get; set; } = string.Empty;
        public bool IsBold { get; set; }
        public bool IsItalic { get; set; }
        public bool IsHeading { get; set; }
    }

    // Additional classes for enhanced DOCX processing
    public class DocxDocumentStructure
    {
        public List<DocxDocumentParagraph> Paragraphs { get; set; } = new List<DocxDocumentParagraph>();
    }

    public class DocxDocumentParagraph
    {
        public string Text { get; set; } = string.Empty;
        public bool IsBold { get; set; }
        public bool IsItalic { get; set; }
        public bool IsHeading { get; set; }
        public int IndentLevel { get; set; }
        public int FontSize { get; set; } = 12;
    }
}
