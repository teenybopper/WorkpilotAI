# WorkPilot AI — Web Frontend

The user interface for WorkPilot AI, built with React 19, Vite, and Tailwind CSS v4.

## 🚀 Features & Pages

- **Dashboard (`/`)**: Overview of active workspace metrics, recent sources, pending tasks, key decisions, risk flags, and local desktop companion connection status.
- **DocOps (`/docops`)**: Document processing suite featuring file uploads, Docling Markdown extraction, entity metadata viewer, RAG semantic search, and document version diff tool.
- **MeetOps (`/meetops`)**: Meeting intelligence hub supporting audio uploads, live desktop listener session controls, speaker-diarized transcript playback, AI meeting summaries, and extracted insights.
- **ActionOps (`/actions`)**: Agentic workflow hub displaying proposed actions, risk ratings, confidence scores, evidence quotes, payload editing, 1-click approvals, and execution audit history.
- **Integrations (`/integrations`)**: Tool management page for configuring Jira, Slack, Google Docs, and Email connectors with credentials and API keys.
- **Settings (`/settings`)**: Local app settings for configuring OpenAI API Key, Hugging Face Token, data directory paths, and workspace preferences.

## 🛠 Tech Stack

- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React (`lucide-react`)
- **Routing**: React Router v7 (`react-router-dom`)
- **HTTP Client**: Axios (`axios`)

## 💻 Development

```bash
# Install dependencies
npm install

# Start development server (with HMR)
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

