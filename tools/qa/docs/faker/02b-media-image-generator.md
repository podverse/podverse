# Fake Data Generator - Image Generator

## Overview

Generates simple PNG/JPEG images with random background colors and optional text overlays. Images are deterministically generated based on the ID in the URL, ensuring consistent results.

## Dependencies

```bash
npm install sharp
```

## Implementation (`server/imageGenerator.ts`)

```typescript
import sharp from 'sharp';
import { faker } from '@faker-js/faker';

interface ImageOptions {
  width: number;
  height: number;
  format: 'png' | 'jpg';
  id: string;
}

class ImageGenerator {
  // Predefined color palette for variety
  private colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FFD700',
    '#FF4500', '#1E90FF', '#00FA9A', '#FF1493', '#00BFFF'
  ];
  
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const match = path.match(/\/images\/([^.]+)\.(png|jpg|jpeg)$/);
    if (!match) return null;
    
    const [, id, format] = match;
    const options = this.parseIdForOptions(id, format as 'png' | 'jpg');
    
    const buffer = await this.createImage(options);
    
    return {
      data: buffer,
      contentType: format === 'png' ? 'image/png' : 'image/jpeg'
    };
  }
  
  private parseIdForOptions(id: string, format: 'png' | 'jpg'): ImageOptions {
    // Use id hash to determine consistent properties
    const hash = this.hashString(id);
    
    // Standard podcast artwork sizes
    const sizes = [
      { width: 3000, height: 3000 },  // Apple Podcasts recommended
      { width: 1400, height: 1400 },  // Minimum for Apple
      { width: 600, height: 600 },    // Medium
      { width: 300, height: 300 },    // Thumbnail
      { width: 144, height: 144 },    // Small thumbnail
    ];
    
    const sizeIndex = hash % sizes.length;
    
    return {
      ...sizes[sizeIndex],
      format,
      id
    };
  }
  
  private async createImage(options: ImageOptions): Promise<Buffer> {
    const { width, height, format, id } = options;
    
    // Deterministic color based on id
    const hash = this.hashString(id);
    const bgColor = this.colors[hash % this.colors.length];
    const textColor = this.getContrastColor(bgColor);
    
    // Create SVG with background and text
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <text
          x="50%"
          y="45%"
          font-family="Arial, sans-serif"
          font-size="${Math.floor(width / 8)}px"
          font-weight="bold"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="middle"
        >DEMO</text>
        <text
          x="50%"
          y="60%"
          font-family="Arial, sans-serif"
          font-size="${Math.floor(width / 16)}px"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="middle"
        >${id.substring(0, 8)}</text>
      </svg>
    `;
    
    let image = sharp(Buffer.from(svg));
    
    if (format === 'jpg') {
      return image.jpeg({ quality: 80 }).toBuffer();
    } else {
      return image.png().toBuffer();
    }
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
  
  private getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }
}

export const imageGenerator = new ImageGenerator();
```

## Features

- **Deterministic colors**: Same ID always produces same color
- **Multiple sizes**: Supports standard podcast artwork dimensions
- **Format support**: PNG and JPEG
- **Text overlay**: Shows "DEMO" and partial ID for identification
- **Contrast text**: Automatically calculates readable text color

## Example URLs

```
http://localhost:2111/images/channel-abc123.png
http://localhost:2111/images/item-def456.jpg
http://localhost:2111/images/profile-user1.png
```
