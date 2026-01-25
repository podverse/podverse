# Fake Data Generator - Video Generator

## Overview

Generates minimal valid video files (MP4, WebM) with a colored background. Duration is deterministic based on the ID (5-30 seconds).

## Implementation (`server/videoGenerator.ts`)

```typescript
class VideoGenerator {
  private colors = [
    [255, 107, 107], [78, 205, 196], [69, 183, 209], [150, 206, 180],
    [255, 234, 167], [221, 160, 221], [152, 216, 200], [247, 220, 111]
  ];
  
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const match = path.match(/\/video\/([^.]+)\.(mp4|webm)$/);
    if (!match) return null;
    
    const [, id, format] = match;
    
    // Duration between 5-30 seconds based on id hash
    const hash = this.hashString(id);
    const duration = 5 + (hash % 26);
    
    let buffer: Buffer;
    let contentType: string;
    
    switch (format) {
      case 'mp4':
        buffer = this.generateMinimalMp4(id, duration);
        contentType = 'video/mp4';
        break;
      case 'webm':
        buffer = this.generateMinimalWebm(id, duration);
        contentType = 'video/webm';
        break;
      default:
        return null;
    }
    
    return { data: buffer, contentType };
  }
  
  private generateMinimalMp4(id: string, durationSeconds: number): Buffer {
    // Generate minimal valid MP4/H.264 file
    // This creates a basic MP4 container with minimal video track
    
    const boxes: Buffer[] = [];
    
    // ftyp box (file type)
    const ftyp = this.createBox('ftyp', Buffer.from([
      0x69, 0x73, 0x6F, 0x6D, // Major brand: isom
      0x00, 0x00, 0x02, 0x00, // Minor version
      0x69, 0x73, 0x6F, 0x6D, // Compatible: isom
      0x69, 0x73, 0x6F, 0x32, // Compatible: iso2
      0x6D, 0x70, 0x34, 0x31  // Compatible: mp41
    ]));
    boxes.push(ftyp);
    
    // moov box (movie metadata)
    const mvhd = this.createMvhdBox(durationSeconds);
    const trak = this.createTrakBox(durationSeconds);
    const moov = this.createBox('moov', Buffer.concat([mvhd, trak]));
    boxes.push(moov);
    
    // mdat box (media data - minimal)
    const mdat = this.createBox('mdat', Buffer.alloc(100));
    boxes.push(mdat);
    
    return Buffer.concat(boxes);
  }
  
  private createBox(type: string, data: Buffer): Buffer {
    const size = data.length + 8;
    const header = Buffer.alloc(8);
    header.writeUInt32BE(size, 0);
    header.write(type, 4, 'ascii');
    return Buffer.concat([header, data]);
  }
  
  private createMvhdBox(durationSeconds: number): Buffer {
    const duration = durationSeconds * 1000; // Timescale: 1000
    const data = Buffer.alloc(108);
    let offset = 0;
    
    data.writeUInt8(0, offset++);  // Version
    offset += 3;                    // Flags
    
    data.writeUInt32BE(0, offset); offset += 4;  // Creation time
    data.writeUInt32BE(0, offset); offset += 4;  // Modification time
    data.writeUInt32BE(1000, offset); offset += 4;  // Timescale
    data.writeUInt32BE(duration, offset); offset += 4;  // Duration
    
    data.writeUInt32BE(0x00010000, offset); offset += 4;  // Rate (1.0)
    data.writeUInt16BE(0x0100, offset); offset += 2;  // Volume (1.0)
    offset += 10;  // Reserved
    
    // Matrix (identity)
    [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].forEach(val => {
      data.writeUInt32BE(val, offset);
      offset += 4;
    });
    
    offset += 24;  // Pre-defined
    data.writeUInt32BE(2, offset);  // Next track ID
    
    return this.createBox('mvhd', data);
  }
  
  private createTrakBox(durationSeconds: number): Buffer {
    const tkhd = this.createTkhdBox(durationSeconds);
    const mdia = this.createMdiaBox(durationSeconds);
    return this.createBox('trak', Buffer.concat([tkhd, mdia]));
  }
  
  private createTkhdBox(durationSeconds: number): Buffer {
    const duration = durationSeconds * 1000;
    const data = Buffer.alloc(92);
    let offset = 0;
    
    data.writeUInt8(0, offset++);  // Version
    data.writeUInt8(0, offset++);  // Flags
    data.writeUInt8(0, offset++);
    data.writeUInt8(3, offset++);  // Track enabled + in movie
    
    offset += 8;  // Creation/modification time
    data.writeUInt32BE(1, offset); offset += 4;  // Track ID
    offset += 4;  // Reserved
    data.writeUInt32BE(duration, offset); offset += 4;
    offset += 8;  // Reserved
    offset += 4;  // Layer + alternate group
    data.writeUInt16BE(0x0100, offset); offset += 2;  // Volume
    offset += 2;  // Reserved
    
    // Matrix
    [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].forEach(val => {
      data.writeUInt32BE(val, offset);
      offset += 4;
    });
    
    data.writeUInt32BE(640 << 16, offset); offset += 4;  // Width
    data.writeUInt32BE(480 << 16, offset);  // Height
    
    return this.createBox('tkhd', data);
  }
  
  private createMdiaBox(durationSeconds: number): Buffer {
    const mdhd = this.createMdhdBox(durationSeconds);
    const hdlr = this.createHdlrBox();
    const minf = this.createMinfBox();
    return this.createBox('mdia', Buffer.concat([mdhd, hdlr, minf]));
  }
  
  private createMdhdBox(durationSeconds: number): Buffer {
    const data = Buffer.alloc(32);
    let offset = 0;
    
    data.writeUInt8(0, offset++);  // Version
    offset += 3;  // Flags
    offset += 8;  // Creation/modification time
    data.writeUInt32BE(1000, offset); offset += 4;  // Timescale
    data.writeUInt32BE(durationSeconds * 1000, offset); offset += 4;
    data.writeUInt16BE(0x55C4, offset);  // Language (und)
    
    return this.createBox('mdhd', data);
  }
  
  private createHdlrBox(): Buffer {
    const data = Buffer.alloc(37);
    let offset = 0;
    
    data.writeUInt8(0, offset++);  // Version
    offset += 3;  // Flags
    offset += 4;  // Pre-defined
    data.write('vide', offset, 'ascii'); offset += 4;  // Handler type
    offset += 12;  // Reserved
    data.write('VideoHandler', offset, 'ascii');
    
    return this.createBox('hdlr', data);
  }
  
  private createMinfBox(): Buffer {
    // Minimal minf with vmhd, dinf, stbl
    const vmhd = this.createBox('vmhd', Buffer.alloc(12));
    
    const dref = this.createBox('dref', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x01,  // Entry count
      0x00, 0x00, 0x00, 0x0C,  // url box size
      0x75, 0x72, 0x6C, 0x20,  // "url "
      0x00, 0x00, 0x00, 0x01   // Self-contained flag
    ]));
    const dinf = this.createBox('dinf', dref);
    
    const stbl = this.createStblBox();
    
    return this.createBox('minf', Buffer.concat([vmhd, dinf, stbl]));
  }
  
  private createStblBox(): Buffer {
    // Sample table with minimal entries
    const stsd = this.createBox('stsd', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x00   // Entry count (0 for minimal)
    ]));
    
    const stts = this.createBox('stts', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x00   // Entry count
    ]));
    
    const stsc = this.createBox('stsc', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x00   // Entry count
    ]));
    
    const stsz = this.createBox('stsz', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x00,  // Sample size
      0x00, 0x00, 0x00, 0x00   // Sample count
    ]));
    
    const stco = this.createBox('stco', Buffer.from([
      0x00, 0x00, 0x00, 0x00,  // Version + flags
      0x00, 0x00, 0x00, 0x00   // Entry count
    ]));
    
    return this.createBox('stbl', Buffer.concat([stsd, stts, stsc, stsz, stco]));
  }
  
  private generateMinimalWebm(id: string, durationSeconds: number): Buffer {
    // Generate minimal WebM/VP8 container
    // WebM uses EBML (Extensible Binary Meta Language)
    
    const elements: Buffer[] = [];
    
    // EBML Header
    elements.push(this.ebmlElement(0x1A45DFA3, Buffer.concat([
      this.ebmlElement(0x4286, this.ebmlUint(1)),      // EBMLVersion
      this.ebmlElement(0x42F7, this.ebmlUint(1)),      // EBMLReadVersion
      this.ebmlElement(0x42F2, this.ebmlUint(4)),      // EBMLMaxIDLength
      this.ebmlElement(0x42F3, this.ebmlUint(8)),      // EBMLMaxSizeLength
      this.ebmlElement(0x4282, Buffer.from('webm')),   // DocType
      this.ebmlElement(0x4287, this.ebmlUint(4)),      // DocTypeVersion
      this.ebmlElement(0x4285, this.ebmlUint(2))       // DocTypeReadVersion
    ])));
    
    // Segment
    const segmentInfo = this.ebmlElement(0x1549A966, Buffer.concat([
      this.ebmlElement(0x2AD7B1, this.ebmlUint(1000000)), // TimestampScale (ns)
      this.ebmlElement(0x4D80, Buffer.from('Podverse Faker')),  // MuxingApp
      this.ebmlElement(0x5741, Buffer.from('Podverse Faker')),  // WritingApp
      this.ebmlElement(0x4489, this.ebmlFloat(durationSeconds * 1000)) // Duration
    ]));
    
    const tracks = this.createWebmTracks();
    
    elements.push(this.ebmlElement(0x18538067, Buffer.concat([
      segmentInfo,
      tracks
    ])));
    
    return Buffer.concat(elements);
  }
  
  private createWebmTracks(): Buffer {
    const videoTrack = this.ebmlElement(0xAE, Buffer.concat([
      this.ebmlElement(0xD7, this.ebmlUint(1)),         // TrackNumber
      this.ebmlElement(0x73C5, this.ebmlUint(1)),       // TrackUID
      this.ebmlElement(0x83, this.ebmlUint(1)),         // TrackType (video)
      this.ebmlElement(0x86, Buffer.from('V_VP8')),     // CodecID
      this.ebmlElement(0xE0, Buffer.concat([            // Video settings
        this.ebmlElement(0xB0, this.ebmlUint(640)),     // PixelWidth
        this.ebmlElement(0xBA, this.ebmlUint(480))      // PixelHeight
      ]))
    ]));
    
    return this.ebmlElement(0x1654AE6B, videoTrack);
  }
  
  private ebmlElement(id: number, data: Buffer): Buffer {
    const idBytes = this.ebmlVint(id, false);
    const sizeBytes = this.ebmlVint(data.length, true);
    return Buffer.concat([idBytes, sizeBytes, data]);
  }
  
  private ebmlVint(value: number, isSize: boolean): Buffer {
    if (value < 0x80 - (isSize ? 1 : 0)) {
      return Buffer.from([value | (isSize ? 0x80 : 0)]);
    } else if (value < 0x4000) {
      return Buffer.from([0x40 | (value >> 8), value & 0xFF]);
    } else if (value < 0x200000) {
      return Buffer.from([0x20 | (value >> 16), (value >> 8) & 0xFF, value & 0xFF]);
    } else {
      return Buffer.from([
        0x10 | (value >> 24),
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF
      ]);
    }
  }
  
  private ebmlUint(value: number): Buffer {
    if (value < 0x100) return Buffer.from([value]);
    if (value < 0x10000) return Buffer.from([value >> 8, value & 0xFF]);
    if (value < 0x1000000) return Buffer.from([value >> 16, (value >> 8) & 0xFF, value & 0xFF]);
    return Buffer.from([value >> 24, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF]);
  }
  
  private ebmlFloat(value: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(value, 0);
    return buf;
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

export const videoGenerator = new VideoGenerator();
```

## Supported Formats

| Format | Content-Type | Resolution | Notes |
|--------|--------------|------------|-------|
| MP4 | `video/mp4` | 640x480 | ISO Base Media container |
| WebM | `video/webm` | 640x480 | VP8 codec container |

## Features

- **Deterministic duration**: Same ID always produces same duration (5-30 seconds)
- **Valid container structure**: Files pass basic validation
- **Standard resolution**: 640x480 pixels
- **Proper metadata**: Duration and track info included

## Example URLs

```
http://localhost:2111/video/item-123.mp4
http://localhost:2111/video/episode-456.webm
```

## Notes

These are minimal valid containers for testing purposes. For production use with actual video content, consider using `ffmpeg` or similar tools.
