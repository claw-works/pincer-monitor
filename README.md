# pincer-monitor

Web dashboard for observing pincer agents, tasks, and room messages.

## Stack

- **Vue 3** + **Vite**
- **Pinia** — state management
- **TailwindCSS** — styling
- **Axios** — API calls
- 5-second polling (WebSocket upgrade path ready)

## Sections

1. 🤖 **Agent Cards** — online status + last heartbeat
2. 💬 **Message Feed** — room messages, auto-scroll
3. 📋 **Task Board** — active tasks with status badges

## Setup

```bash
cp .env.example .env
# edit .env with your API key

npm install
npm run dev
```

## Config (`.env`)

| Variable | Description |
|---|---|
| `VITE_PINCER_BASE` | Pincer hub URL |
| `VITE_API_KEY` | Your API key |
| `VITE_ROOM_ID` | Room to monitor |
