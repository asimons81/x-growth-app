# X CSV Import Formats

## Overview
The import endpoint supports **two formats**:

1. **Post-level performance CSV** (`type=posts`)
2. **Daily analytics CSV** (`type=analytics`)

The parser normalizes headers by:
- lowercasing
- trimming whitespace
- replacing spaces/special characters with `_`

Examples:
- `Tweet Text` → `tweet_text`
- `Engagement Rate (%)` → `engagement_rate`
- `Posts Count` → `posts_count`

---

## 1) Post-level CSV (`type=posts`)

### Required
At least one content column:
- `content`
- `text`
- `tweet text` / `tweet_text`
- `post text` / `post_text`

### Optional recognized columns
- Post time: `posted_at`, `post date`, `date posted`, `published at`, `timestamp`, `date`
- Impressions: `impressions`, `impression`, `views`
- Likes: `likes`, `like`, `favorites`, `favourites`
- Replies: `replies`, `reply`, `comments`, `comment`
- Retweets: `retweets`, `retweet`, `reposts`, `repost`, `shares`
- Also recognized as aliases (not currently persisted): `bookmark`/`bookmarks`, `engagement rate`/`engagement_rate`

### Example
```csv
Tweet Text,Post Date,Impressions,Likes,Replies,Reposts
"Launched the new feature",2026-04-01,12345,560,24,72
"Build in public works",2026-04-02,9800,420,31,55
```

---

## 2) Daily analytics CSV (`type=analytics`)

### Required
A date column:
- `date`
- `day`
- `metric date` / `metric_date`

### Optional recognized columns
- Followers: `followers`, `follower`, `follower count`, `follower_count`, `followers gained`
- Impressions: `impressions`, `impression`, `views`
- Engagements: `engagements`, `engagement`, `total engagements`, `total_engagements`, `interactions`
- Posts count: `posts_count`, `posts`, `post_count`, `tweets`, `tweet_count`

### Example
```csv
day,follower count,impression,total engagements,tweets
2026-04-01,15420,45000,2400,3
2026-04-02,15450,39200,2010,2
```

---

## Validation errors
If validation fails, the API responds with:
- normalized `headers` detected in the file
- `expected_headers` for the selected import type
- `supported_formats` (short list of accepted import modes)

This helps identify mismatched uploads quickly (for example, uploading daily analytics into a post-level import).
