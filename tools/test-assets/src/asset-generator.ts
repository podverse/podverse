import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

/** Exported so CLI can pick one frequency per item and pass it to all formats. */
export const AUDIO_FREQ_MIN = 220;
export const AUDIO_FREQ_MAX = 440;

export class AssetGenerator {
  private assetsDir: string;
  private namespace: string;

  constructor(options: { namespace?: string } = {}) {
    this.namespace = options?.namespace ?? '';
    // Assets directory is tools/test-assets/assets/ or tools/test-assets/assets/<namespace>/
    this.assetsDir = path.join(__dirname, '../assets', this.namespace);
  }

  async ensureAssetsDirectory(): Promise<void> {
    const subdirs = ['audio', 'feeds', 'images', 'videos'];
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
    for (const sub of subdirs) {
      const dir = path.join(this.assetsDir, sub);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Generate a single image file. Optional sizeLabel is drawn in large text (FFmpeg drawtext)
   * for visual identification (e.g. "300" or "600×600").
   */
  async generateImage(
    filename: string,
    backgroundColor: string = '#FF0000',
    size: { width: number; height: number } = { width: 800, height: 800 },
    sizeLabel?: string
  ): Promise<void> {
    const filePath = path.join(this.assetsDir, 'images', filename);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      return;
    }

    try {
      const ffmpegStatic = await import('ffmpeg-static').catch((err) => {
        throw new Error(
          `Failed to import ffmpeg-static. Make sure to run 'npm install' first. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      const ffmpegPath = ffmpegStatic.default;

      if (!ffmpegPath) {
        throw new Error('ffmpeg-static binary not found. Make sure ffmpeg-static is installed.');
      }

      const hexColor = backgroundColor.replace('#', '');
      const { width, height } = size;
      // Escape single quotes in label for drawtext (replace ' with '\'')
      const safeLabel = sizeLabel ? sizeLabel.replace(/'/g, "'\\''") : '';
      // Scale font with image size so overlay is readable on 300/600/1400px assets
      const fontSize = Math.max(24, Math.round(Math.min(width, height) * 0.12));
      const drawtextFilter =
        safeLabel !== ''
          ? ` -vf "drawtext=text='${safeLabel}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2"`
          : '';
      const command = `"${ffmpegPath}" -f lavfi -i color=c=${hexColor}:s=${width}x${height}:d=1 -frames:v 1 -pix_fmt yuvj420p${drawtextFilter} -y "${filePath}"`;

      await execAsync(command);
      console.log(`   ✅ Generated: ${filename} (color: ${backgroundColor}, ${width}x${height})`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate image file ${filename}: ${errorMessage}`);
    }
  }

  /**
   * Generate multiple image sizes for one logical index (e.g. image-001-300.jpg, image-001-600.jpg).
   * Respects skip-if-exists. sizeLabel is drawn on each image when provided.
   */
  async generateImageSizes(
    indexPad: string,
    widths: number[],
    backgroundColor: string,
    sizeLabel?: boolean
  ): Promise<void> {
    for (const w of widths) {
      const filename = `image-${indexPad}-${w}.jpg`;
      const label = sizeLabel ? `${w}` : undefined;
      await this.generateImage(filename, backgroundColor, { width: w, height: w }, label);
    }
  }

  async generateMP3(
    filename: string,
    durationSeconds: number = 300,
    frequencyHz?: number
  ): Promise<void> {
    const filePath = path.join(this.assetsDir, 'audio', filename);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      return;
    }

    try {
      // Import ffmpeg-static dynamically
      const ffmpegStatic = await import('ffmpeg-static').catch((err) => {
        throw new Error(
          `Failed to import ffmpeg-static. Make sure to run 'npm install' first. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      const ffmpegPath = ffmpegStatic.default;

      if (!ffmpegPath) {
        throw new Error('ffmpeg-static binary not found. Make sure ffmpeg-static is installed.');
      }

      const frequency = frequencyHz ?? this.getAudioFrequency();
      const command = `"${ffmpegPath}" -f lavfi -i sine=frequency=${frequency}:duration=${durationSeconds} -t ${durationSeconds} -acodec libmp3lame -b:a 128k -y "${filePath}"`;

      await execAsync(command);
      console.log(`   ✅ Generated: ${filename} (${durationSeconds}s)`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate MP3 file ${filename}: ${errorMessage}`);
    }
  }

  async generateMP4(
    filename: string,
    durationSeconds: number = 300,
    frequencyHz?: number
  ): Promise<void> {
    const filePath = path.join(this.assetsDir, 'videos', filename);

    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      return;
    }

    try {
      // Import ffmpeg-static dynamically
      const ffmpegStatic = await import('ffmpeg-static').catch((err) => {
        throw new Error(
          `Failed to import ffmpeg-static. Make sure to run 'npm install' first. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      const ffmpegPath = ffmpegStatic.default;

      if (!ffmpegPath) {
        throw new Error('ffmpeg-static binary not found. Make sure ffmpeg-static is installed.');
      }

      const frequency = frequencyHz ?? this.getAudioFrequency();
      const command = `"${ffmpegPath}" -f lavfi -i testsrc2=duration=${durationSeconds}:size=320x240:rate=1 -f lavfi -i sine=frequency=${frequency}:duration=${durationSeconds} -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 128k -t ${durationSeconds} -y "${filePath}"`;

      await execAsync(command);
      console.log(`   ✅ Generated: ${filename} (${durationSeconds}s)`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate MP4 file ${filename}: ${errorMessage}`);
    }
  }

  /** 07b: Generate OGG (Vorbis) audio; skip if exists. Cap 100 per type (caller's responsibility). */
  async generateOGG(
    filename: string,
    durationSeconds: number = 300,
    frequencyHz?: number
  ): Promise<void> {
    const filePath = path.join(this.assetsDir, 'audio', filename);
    if (fs.existsSync(filePath)) {
      return;
    }
    try {
      const ffmpegStatic = await import('ffmpeg-static').catch((err) => {
        throw new Error(
          `Failed to import ffmpeg-static. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      const ffmpegPath = ffmpegStatic.default;
      if (!ffmpegPath) {
        throw new Error('ffmpeg-static binary not found.');
      }
      const frequency = frequencyHz ?? this.getAudioFrequency();
      const command = `"${ffmpegPath}" -f lavfi -i sine=frequency=${frequency}:duration=${durationSeconds} -t ${durationSeconds} -acodec libvorbis -y "${filePath}"`;
      await execAsync(command);
      console.log(`   ✅ Generated: ${filename} (${durationSeconds}s)`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate OGG file ${filename}: ${errorMessage}`);
    }
  }

  /** 07b: Generate WebM (VP9 + Vorbis); skip if exists. Cap 100 per type (caller's responsibility). */
  async generateWebM(
    filename: string,
    durationSeconds: number = 300,
    frequencyHz?: number
  ): Promise<void> {
    const filePath = path.join(this.assetsDir, 'videos', filename);
    if (fs.existsSync(filePath)) {
      return;
    }
    try {
      const ffmpegStatic = await import('ffmpeg-static').catch((err) => {
        throw new Error(
          `Failed to import ffmpeg-static. Error: ${err instanceof Error ? err.message : String(err)}`
        );
      });
      const ffmpegPath = ffmpegStatic.default;
      if (!ffmpegPath) {
        throw new Error('ffmpeg-static binary not found.');
      }
      const frequency = frequencyHz ?? this.getAudioFrequency();
      const command = `"${ffmpegPath}" -f lavfi -i testsrc2=duration=${durationSeconds}:size=320x240:rate=1 -f lavfi -i sine=frequency=${frequency}:duration=${durationSeconds} -c:v libvpx-vp9 -c:a libvorbis -t ${durationSeconds} -y "${filePath}"`;
      await execAsync(command);
      console.log(`   ✅ Generated: ${filename} (${durationSeconds}s)`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate WebM file ${filename}: ${errorMessage}`);
    }
  }

  async generateAllAssets(): Promise<void> {
    await this.ensureAssetsDirectory();

    console.log(`🎨 Generating test assets (${this.namespace})...\n`);

    // Generate channel images with different colors
    console.log('   → Generating channel images...');
    await this.generateImage('chan-1-image.jpg', '#FF6B6B'); // Red
    await this.generateImage('chan-2-image.jpg', '#4ECDC4'); // Teal
    await this.generateImage('chan-3-image.jpg', '#45B7D1'); // Blue

    // Generate item images with different colors
    console.log('   → Generating item images...');
    await this.generateImage('item-1-image.jpg', '#96CEB4'); // Green
    await this.generateImage('item-2-image.jpg', '#FFEAA7'); // Yellow
    await this.generateImage('item-3-image.jpg', '#DDA0DD'); // Plum

    // Generate media files (5 minutes each = 300 seconds)
    console.log('   → Generating media files (5 minutes each)...');
    await this.generateMP3('item-1-podcast.mp3', 300);
    await this.generateMP4('item-2-video.mp4', 300);
    await this.generateMP3('item-3-music.mp3', 300);

    console.log('   ✅ All assets generated\n');
  }

  private getAudioFrequency(): number {
    return AUDIO_FREQ_MIN + Math.floor(Math.random() * (AUDIO_FREQ_MAX - AUDIO_FREQ_MIN + 1));
  }
}
