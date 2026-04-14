# X Analytics CSV Format

## Overview
This document describes the CSV format for importing X (Twitter) analytics data into x-growth-app.

## CSV Format for Analytics Import

The analytics CSV should contain daily metrics with the following columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| date | Yes | Date of the metrics (YYYY-MM-DD or MM/DD/YYYY) | 2024-01-15 |
| followers | No | Total follower count for the day | 15234 |
| impressions | No | Total impressions for the day | 45678 |
| engagements | No | Total engagements for the day (likes + replies + retweets) | 1234 |
| posts_count | No | Number of posts published that day | 3 |

## Example CSV

```csv
date,followers,impressions,engagements,posts_count
2024-01-15,15234,45678,1234,3
2024-01-14,15100,38900,980,2
2024-01-13,14950,52100,1560,4
```

## Notes

- Date format is flexible - the system accepts `YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, or most common date formats
- Only the `date` column is required; all other columns default to 0 if not provided
- Imported data is stored in the `daily_metrics` table
- You can import analytics from X Analytics dashboard (export as CSV) or compile manually

## For @tonysimons_ 

To export your X analytics:
1. Go to X Analytics (x.com/analytics)
2. Navigate to Posts or Audience tabs
3. Look for Export functionality
4. Use the exported data to populate the `impressions`, `engagements`, and `posts_count` columns
5. For `followers`, check your profile stats for each day

## CSV Format for Posts Import

If you want to import individual posts with their performance:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| content | Yes | The post text content | "My first post!" |
| posted_at | No | When the post was published | 2024-01-15 |
| impressions | No | View count | 5000 |
| likes | No | Like count | 234 |
| replies | No | Reply count | 45 |
| retweets | No | Retweet count | 67 |

## Example Posts CSV

```csv
content,posted_at,impressions,likes,replies,retweets
"Launched my new course today! Check it out.","2024-01-15",15000,890,120,340
"5 lessons learned from building in public","2024-01-14",8500,567,89,201
```
