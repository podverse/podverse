# Fake Data Generator - RSS, Chapters & Transcripts

## Overview

Generates valid RSS 2.0 feeds with Podcast Namespace extensions, JSON chapters, and WebVTT/SRT transcripts.

## RSS Generator

### Implementation (`server/rssGenerator.ts`)

```typescript
import { faker } from '@faker-js/faker';

class RSSGenerator {
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const match = path.match(/\/rss\/(\d+)\.xml$/);
    if (!match) return null;

    const feedId = parseInt(match[1], 10);
    const xml = this.generateRssFeed(feedId);

    return {
      data: Buffer.from(xml, 'utf-8'),
      contentType: 'application/rss+xml; charset=utf-8',
    };
  }

  private generateRssFeed(feedId: number): string {
    // Seed faker for consistent results
    faker.seed(feedId);

    const channelTitle = faker.company.name() + ' Podcast';
    const channelDescription = faker.lorem.paragraph();
    const channelLink = faker.internet.url();
    const channelImage = `http://localhost:2111/images/channel-${feedId}.png`;
    const podcastGuid = faker.string.uuid();

    const items = this.generateItems(feedId, 10);

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${this.escapeXml(channelTitle)}</title>
    <description>${this.escapeXml(channelDescription)}</description>
    <link>${this.escapeXml(channelLink)}</link>
    <language>en-us</language>
    <copyright>© ${new Date().getFullYear()} ${this.escapeXml(channelTitle)}</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>

    <itunes:author>${this.escapeXml(faker.person.fullName())}</itunes:author>
    <itunes:summary>${this.escapeXml(channelDescription)}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="${channelImage}"/>
    <itunes:category text="Technology"/>

    <podcast:guid>${podcastGuid}</podcast:guid>
    <podcast:medium>podcast</podcast:medium>
    <podcast:locked>no</podcast:locked>

    <image>
      <url>${channelImage}</url>
      <title>${this.escapeXml(channelTitle)}</title>
      <link>${this.escapeXml(channelLink)}</link>
    </image>

${items}
  </channel>
</rss>`;
  }

  private generateItems(feedId: number, count: number): string {
    const items: string[] = [];

    for (let i = 0; i < count; i++) {
      const itemId = `${feedId}-${i}`;
      const guid = faker.string.uuid();
      const title = faker.lorem.sentence();
      const description = faker.lorem.paragraphs(2);
      const pubDate = faker.date.recent({ days: 30 * (i + 1) });
      const duration = faker.number.int({ min: 300, max: 3600 });
      const enclosureUrl = `http://localhost:2111/audio/${itemId}.mp3`;
      const imageUrl = `http://localhost:2111/images/item-${itemId}.png`;

      items.push(`    <item>
      <title>${this.escapeXml(title)}</title>
      <description>${this.escapeXml(description)}</description>
      <link>http://localhost:2111/episode/${itemId}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate.toUTCString()}</pubDate>

      <enclosure url="${enclosureUrl}" length="${faker.number.int({ min: 1000000, max: 50000000 })}" type="audio/mpeg"/>

      <itunes:title>${this.escapeXml(title)}</itunes:title>
      <itunes:summary>${this.escapeXml(description.substring(0, 255))}</itunes:summary>
      <itunes:duration>${this.formatDuration(duration)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:episode>${count - i}</itunes:episode>
      <itunes:image href="${imageUrl}"/>

      <podcast:transcript url="http://localhost:2111/transcripts/${itemId}.vtt" type="text/vtt"/>
      <podcast:chapters url="http://localhost:2111/chapters/${itemId}.json" type="application/json+chapters"/>
    </item>`);
    }

    return items.join('\n\n');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export const rssGenerator = new RSSGenerator();
```

## Chapters Generator

### Implementation (`server/chaptersGenerator.ts`)

```typescript
import { faker } from '@faker-js/faker';

class ChaptersGenerator {
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const match = path.match(/\/chapters\/([^.]+)\.json$/);
    if (!match) return null;

    const itemId = match[1];
    const chapters = this.generateChapters(itemId);

    return {
      data: Buffer.from(JSON.stringify(chapters, null, 2), 'utf-8'),
      contentType: 'application/json',
    };
  }

  private generateChapters(itemId: string): object {
    faker.seed(this.hashString(itemId));

    const chapterCount = faker.number.int({ min: 3, max: 12 });
    const totalDuration = faker.number.int({ min: 600, max: 3600 });
    const chapters: any[] = [];

    let currentTime = 0;
    const avgChapterLength = totalDuration / chapterCount;

    for (let i = 0; i < chapterCount; i++) {
      const chapterDuration =
        i === chapterCount - 1
          ? totalDuration - currentTime
          : Math.floor(avgChapterLength * (0.5 + Math.random()));

      chapters.push({
        startTime: currentTime,
        title: faker.lorem.sentence({ min: 2, max: 6 }),
        img:
          Math.random() > 0.5
            ? `http://localhost:2111/images/chapter-${itemId}-${i}.png`
            : undefined,
        url: Math.random() > 0.7 ? faker.internet.url() : undefined,
        toc: true,
      });

      currentTime += chapterDuration;
    }

    return {
      version: '1.2.0',
      chapters,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const chaptersGenerator = new ChaptersGenerator();
```

## Transcript Generator

### Implementation (`server/transcriptGenerator.ts`)

```typescript
import { faker } from '@faker-js/faker';

class TranscriptGenerator {
  async generate(path: string): Promise<{ data: Buffer; contentType: string } | null> {
    const vttMatch = path.match(/\/transcripts\/([^.]+)\.vtt$/);
    const srtMatch = path.match(/\/transcripts\/([^.]+)\.srt$/);

    if (vttMatch) {
      const transcript = this.generateVtt(vttMatch[1]);
      return {
        data: Buffer.from(transcript, 'utf-8'),
        contentType: 'text/vtt',
      };
    }

    if (srtMatch) {
      const transcript = this.generateSrt(srtMatch[1]);
      return {
        data: Buffer.from(transcript, 'utf-8'),
        contentType: 'text/srt',
      };
    }

    return null;
  }

  private generateVtt(itemId: string): string {
    faker.seed(this.hashString(itemId));

    const lines: string[] = ['WEBVTT', ''];
    const cueCount = faker.number.int({ min: 20, max: 100 });
    let currentTime = 0;

    for (let i = 0; i < cueCount; i++) {
      const duration = faker.number.float({ min: 2, max: 8 });
      const endTime = currentTime + duration;

      lines.push(`${i + 1}`);
      lines.push(`${this.formatVttTime(currentTime)} --> ${this.formatVttTime(endTime)}`);
      lines.push(faker.lorem.sentence({ min: 5, max: 15 }));
      lines.push('');

      currentTime = endTime + faker.number.float({ min: 0.1, max: 0.5 });
    }

    return lines.join('\n');
  }

  private generateSrt(itemId: string): string {
    faker.seed(this.hashString(itemId));

    const lines: string[] = [];
    const cueCount = faker.number.int({ min: 20, max: 100 });
    let currentTime = 0;

    for (let i = 0; i < cueCount; i++) {
      const duration = faker.number.float({ min: 2, max: 8 });
      const endTime = currentTime + duration;

      lines.push(`${i + 1}`);
      lines.push(`${this.formatSrtTime(currentTime)} --> ${this.formatSrtTime(endTime)}`);
      lines.push(faker.lorem.sentence({ min: 5, max: 15 }));
      lines.push('');

      currentTime = endTime + faker.number.float({ min: 0.1, max: 0.5 });
    }

    return lines.join('\n');
  }

  private formatVttTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  }

  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const transcriptGenerator = new TranscriptGenerator();
```

## Example URLs

### RSS Feeds

```
http://localhost:2111/rss/1.xml
http://localhost:2111/rss/42.xml
```

### Chapters

```
http://localhost:2111/chapters/1-0.json
http://localhost:2111/chapters/item-abc123.json
```

### Transcripts

```
http://localhost:2111/transcripts/1-0.vtt
http://localhost:2111/transcripts/item-abc123.srt
```

## Features

### RSS Generator

- Valid RSS 2.0 with iTunes and Podcast Namespace extensions
- Deterministic content based on feed ID
- Includes 10 items per feed
- References chapter and transcript files

### Chapters Generator

- Follows Podcasting 2.0 chapters JSON format
- 3-12 chapters per item
- Optional images and links

### Transcript Generator

- WebVTT and SRT formats
- 20-100 cues per transcript
- Natural timing gaps between cues
