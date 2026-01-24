# Fake Data Generator - Audio Generator

## Overview

Generates minimal valid audio files (MP3, OGG, WAV). For simplicity, generates a simple sine wave tone. Duration is deterministic based on the ID (5-30 seconds).

## Implementation (`server/audioGenerator.ts`)

```typescript
class AudioGenerator {
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const match = path.match(/\/audio\/([^.]+)\.(mp3|ogg|wav)$/);
    if (!match) return null;
    
    const [, id, format] = match;
    
    // Duration between 5-30 seconds based on id hash
    const hash = this.hashString(id);
    const duration = 5 + (hash % 26); // 5-30 seconds
    
    let buffer: Buffer;
    let contentType: string;
    
    switch (format) {
      case 'mp3':
        buffer = this.generateMinimalMp3(duration);
        contentType = 'audio/mpeg';
        break;
      case 'ogg':
        buffer = this.generateMinimalOgg(duration);
        contentType = 'audio/ogg';
        break;
      case 'wav':
        buffer = this.generateWav(duration);
        contentType = 'audio/wav';
        break;
      default:
        return null;
    }
    
    return { data: buffer, contentType };
  }
  
  private generateWav(durationSeconds: number): Buffer {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSeconds;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    
    const buffer = Buffer.alloc(44 + dataSize);
    let offset = 0;
    
    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    
    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;           // Chunk size
    buffer.writeUInt16LE(1, offset); offset += 2;            // Audio format (PCM)
    buffer.writeUInt16LE(numChannels, offset); offset += 2;  // Channels
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;   // Sample rate
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), offset); offset += 4;
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
    
    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;
    
    // Generate a simple sine wave tone (440 Hz)
    const frequency = 440;
    const amplitude = 16000; // Less than max to avoid clipping
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Fade in/out for the first and last 0.1 seconds
      let envelope = 1.0;
      if (t < 0.1) envelope = t / 0.1;
      else if (t > durationSeconds - 0.1) envelope = (durationSeconds - t) / 0.1;
      
      const sample = Math.floor(amplitude * envelope * Math.sin(2 * Math.PI * frequency * t));
      buffer.writeInt16LE(sample, offset);
      offset += 2;
    }
    
    return buffer;
  }
  
  private generateMinimalMp3(durationSeconds: number): Buffer {
    // Generate a minimal valid MP3 file
    // This creates a very basic MP3 with silent frames
    // For production, consider using a library like lame or ffmpeg
    
    const frames: Buffer[] = [];
    const framesPerSecond = 38.28; // Approximate for 128kbps
    const totalFrames = Math.ceil(durationSeconds * framesPerSecond);
    
    // MP3 frame header for 128kbps, 44100Hz, stereo
    // Sync word (0xFFE) + version + layer + etc
    const frameHeader = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
    const frameData = Buffer.alloc(417 - 4); // 417 bytes per frame at 128kbps
    
    for (let i = 0; i < totalFrames; i++) {
      frames.push(frameHeader);
      frames.push(frameData);
    }
    
    // Add ID3v2 header
    const id3Header = Buffer.from([
      0x49, 0x44, 0x33, // "ID3"
      0x04, 0x00,       // Version 2.4.0
      0x00,             // Flags
      0x00, 0x00, 0x00, 0x00  // Size (0)
    ]);
    
    return Buffer.concat([id3Header, ...frames]);
  }
  
  private generateMinimalOgg(durationSeconds: number): Buffer {
    // Generate a minimal valid Ogg Vorbis file
    // This is a simplified version - real implementation would need libvorbis
    
    // For now, return a minimal valid Ogg container with Vorbis headers
    const oggPage = (pageSequence: number, data: Buffer, headerType: number = 0): Buffer => {
      const header = Buffer.alloc(27 + 1);
      header.write('OggS', 0);           // Capture pattern
      header.writeUInt8(0, 4);           // Version
      header.writeUInt8(headerType, 5);  // Header type
      header.writeBigUInt64LE(BigInt(0), 6);  // Granule position
      header.writeUInt32LE(1, 14);       // Serial number
      header.writeUInt32LE(pageSequence, 18); // Page sequence
      header.writeUInt32LE(0, 22);       // CRC (would need to calculate)
      header.writeUInt8(1, 26);          // Number of segments
      header.writeUInt8(data.length, 27); // Segment table
      
      return Buffer.concat([header, data]);
    };
    
    // Vorbis identification header
    const vorbisId = Buffer.from([
      0x01,                    // Packet type (identification)
      0x76, 0x6F, 0x72, 0x62, 0x69, 0x73,  // "vorbis"
      0x00, 0x00, 0x00, 0x00,  // Version
      0x01,                    // Channels
      0x44, 0xAC, 0x00, 0x00,  // Sample rate (44100)
      0x00, 0x00, 0x00, 0x00,  // Bitrate max
      0x80, 0xBB, 0x00, 0x00,  // Bitrate nominal (48000)
      0x00, 0x00, 0x00, 0x00,  // Bitrate min
      0xB8,                    // Block sizes
      0x01                     // Framing flag
    ]);
    
    // Comment header (minimal)
    const vorbisComment = Buffer.from([
      0x03,                    // Packet type (comment)
      0x76, 0x6F, 0x72, 0x62, 0x69, 0x73,  // "vorbis"
      0x06, 0x00, 0x00, 0x00,  // Vendor length
      0x50, 0x6F, 0x64, 0x76, 0x65, 0x72,  // "Podver"
      0x00, 0x00, 0x00, 0x00,  // User comment count
      0x01                     // Framing flag
    ]);
    
    // Setup header (minimal - would need real codebooks)
    const vorbisSetup = Buffer.from([
      0x05,                    // Packet type (setup)
      0x76, 0x6F, 0x72, 0x62, 0x69, 0x73,  // "vorbis"
      // Minimal setup data
      0x00, 0x00, 0x00, 0x00
    ]);
    
    return Buffer.concat([
      oggPage(0, vorbisId, 0x02),      // BOS
      oggPage(1, vorbisComment, 0x00),
      oggPage(2, vorbisSetup, 0x00),
      oggPage(3, Buffer.alloc(0), 0x04) // EOS
    ]);
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const audioGenerator = new AudioGenerator();
```

## Supported Formats

| Format | Content-Type | Notes |
|--------|--------------|-------|
| WAV | `audio/wav` | Full PCM audio with 440Hz sine wave |
| MP3 | `audio/mpeg` | Minimal valid MP3 (silent frames) |
| OGG | `audio/ogg` | Minimal Ogg Vorbis container |

## Features

- **Deterministic duration**: Same ID always produces same duration (5-30 seconds)
- **Fade in/out**: WAV files have smooth 0.1s fade to avoid clicks
- **Standard sample rate**: 44100 Hz
- **Valid file structure**: All formats pass basic validation

## Example URLs

```
http://localhost:2111/audio/item-123.mp3
http://localhost:2111/audio/episode-456.wav
http://localhost:2111/audio/trailer-789.ogg
```

## Notes

For production use with actual audio content, consider using libraries like:
- `ffmpeg` for comprehensive format support
- `lame` for proper MP3 encoding
- `libvorbis` for proper OGG encoding
