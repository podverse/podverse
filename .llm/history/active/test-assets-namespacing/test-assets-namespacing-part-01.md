### Session 1 - 2026-02-04

#### Prompt (Developer)

this

Required Files

The following files are automatically generated or provided:

Channel Images (Generated)

chan-1-image.jpg - Image for Podcast channel

chan-2-image.jpg - Image for Video channel

chan-3-image.jpg - Image for Music channel

Item Images (Generated)

item-1-image.jpg - Image for Podcast episode

item-2-image.jpg - Image for Video episode

item-3-image.jpg - Image for Music track

Media Files (Generated - 5 minutes each)

item-1-podcast.mp3 - Audio file for Podcast episode (5 minutes)

item-2-video.mp4 - Video file for Video episode (5 minutes)

item-3-music.mp3 - Audio file for Music track (5 minutes)

RSS Feed Files (Source Controlled)

feed-1.rss - RSS feed for Podcast channel

feed-2.rss - RSS feed for Video channel

feed-3.rss - RSS feed for Music channel

is specicially for the lighthouse test case

but we will want to allow the test-assets to generate and serve assets for many different use cases. come up with a way to group and segment this. i would suggest these assets be served under localhost:2111/lighthouse/<assets>

so localhost:2111/<toolname>/<assets>

#### Key Decisions

- Namespace test assets by tool under `assets/<toolname>/` and serve via `/<toolname>/...`.

#### Files Modified

- .llm/history/active/test-assets-namespacing/test-assets-namespacing-part-01.md
- tools/test-assets/.gitignore
- tools/test-assets/src/asset-generator.ts
- tools/test-assets/TOOLS-TEST-ASSETS.md
- tools/test-assets/assets/feed-1.rss (deleted)
- tools/test-assets/assets/feed-2.rss (deleted)
- tools/test-assets/assets/feed-3.rss (deleted)
- tools/test-assets/assets/lighthouse/feed-1.rss
- tools/test-assets/assets/lighthouse/feed-2.rss
- tools/test-assets/assets/lighthouse/feed-3.rss
- tools/web-perf/lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md
