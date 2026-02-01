# AI Performance & Feedback System

## Overview
The AI Performance system collects user feedback on AI responses to improve training data and model performance.

## Features

### 1. Message Feedback
- **Like/Dislike buttons** on every AI response
- Feedback stored in database with message content
- Visual indication of feedback status (green for like, red for dislike)

### 2. AI Performance Dashboard
Located at `/ai-performance`, displays:
- **Total Feedback Count** - All feedback received
- **Liked Responses** - Positive feedback with percentage
- **Disliked Responses** - Negative feedback with percentage
- **Filtered Views** - View all, liked only, or disliked only

### 3. Training Data Collection
All feedback is stored with:
- Message ID
- Message content (question and answer)
- Feedback type (like/dislike)
- User comment (optional, for future enhancement)
- Timestamp
- Associated chat ID

## Database Schema

```sql
-- Message table with feedback columns
CREATE TABLE "message" (
  "id" TEXT PRIMARY KEY,
  "chatId" TEXT NOT NULL REFERENCES "chat"("id"),
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "feedback" TEXT,           -- 'like' | 'dislike' | null
  "userComment" TEXT,        -- Optional user comment
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Endpoints

### Submit Feedback
```
PATCH /api/messages/[id]/feedback
Body: { feedback: "like" | "dislike", userComment?: string }
```

### Get Performance Data
```
GET /api/ai-performance?userId={userId}&type={all|like|dislike}
Returns: { messages: [...] }
```

## Usage

### In Chat
1. User receives AI response
2. Like/Dislike buttons appear below response
3. Click to submit feedback
4. Button highlights to show feedback recorded

### In Dashboard
1. Navigate to "AI Performance" in sidebar
2. View statistics cards at top
3. Use tabs to filter by feedback type
4. See all responses with their feedback

## Future Enhancements
- Add user comment field for detailed feedback
- Export training data for model fine-tuning
- Analytics charts and trends
- Feedback comparison across time periods
