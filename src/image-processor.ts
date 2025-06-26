import * as fs from "fs";
import sharp from "sharp";
import type { MaskOption, OutputFormat } from "./types";

export async function processImage(
  inputPath: string,
  mask: MaskOption,
  format: OutputFormat,
  outputPath: string
): Promise<void> {
  try {
    // Get dimensions of the input image
    const imageMetadata = await sharp(inputPath).metadata();
    const originalWidth = imageMetadata.width || 800;
    const originalHeight = imageMetadata.height || 800;

    console.log(`Original image: ${originalWidth}x${originalHeight}`);
    console.log(`Target format: ${format.width}x${format.height}`);

    // Check if mask file exists
    if (!fs.existsSync(mask.path)) {
      throw new Error(`Mask file not found: ${mask.path}`);
    }

    // Step 1: Crop/resize the original image to fit the target format (center crop)
    const targetAspectRatio = format.width / format.height;
    const originalAspectRatio = originalWidth / originalHeight;

    let cropWidth: number;
    let cropHeight: number;
    let cropLeft = 0;
    let cropTop = 0;

    if (originalAspectRatio > targetAspectRatio) {
      // Original is wider - crop width, keep height
      cropHeight = originalHeight;
      cropWidth = Math.floor(originalHeight * targetAspectRatio);
      cropLeft = Math.floor((originalWidth - cropWidth) / 2);
    } else {
      // Original is taller - crop height, keep width
      cropWidth = originalWidth;
      cropHeight = Math.floor(originalWidth / targetAspectRatio);
      cropTop = Math.floor((originalHeight - cropHeight) / 2);
    }

    // Create the base image with center crop and resize to target format
    const baseImageBuffer = await sharp(inputPath)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .resize(format.width, format.height, {
        fit: "fill",
      })
      .toBuffer();

    // Step 2: Prepare the mask
    const scale = mask.scale || 0.8; // Default scale for bottom positioning
    const maskWidth = Math.floor(format.width * scale);

    // Get original mask dimensions to calculate aspect ratio
    const originalMaskMetadata = await sharp(mask.path).metadata();
    const originalMaskWidth = originalMaskMetadata.width || 200;
    const originalMaskHeight = originalMaskMetadata.height || 200;
    const maskAspectRatio = originalMaskHeight / originalMaskWidth;

    const maskHeight = Math.floor(maskWidth * maskAspectRatio);

    // Resize the mask
    const resizedMaskBuffer = await sharp(mask.path)
      .resize(maskWidth, maskHeight, {
        fit: "fill",
      })
      .png()
      .toBuffer();

    // Step 3: Position the mask at the bottom center
    const maskLeft = Math.floor((format.width - maskWidth) / 2);
    const maskTop = format.height - maskHeight;

    // Ensure mask doesn't go outside bounds
    const finalMaskTop = Math.max(0, maskTop);

    console.log(
      `Mask positioned at: ${maskLeft}, ${finalMaskTop} (${maskWidth}x${maskHeight})`
    );

    // Step 4: Composite the mask onto the base image
    await sharp(baseImageBuffer)
      .composite([
        {
          input: resizedMaskBuffer,
          top: finalMaskTop,
          left: maskLeft,
        },
      ])
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    console.log(
      `Successfully created ${format.type} format image: ${format.width}x${format.height}`
    );
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}
