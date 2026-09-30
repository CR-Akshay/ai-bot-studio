# AI Bot Studio

A local application to create, manage, and link AI bots with custom prompts. Build intelligent bot projects and seamlessly share/upload outputs.

## Features

- **Create AI Bots**: Design custom bots with personalized prompts locally
- **Bot Management**: Edit, delete, and organize your bots
- **Project Linking**: Link multiple bots together to create cohesive projects
- **Connectivity & Sharing**: Share projects and upload outputs to external services
- **Local Storage**: All data stored locally with encryption support
- **API Integration**: Connect to various AI providers (OpenAI, Anthropic, etc.)

## Project Structure

```
ai-bot-studio/
├── backend/              # Express.js server
├── frontend/             # React UI application
├── desktop/              # Electron desktop app
├── shared/               # Shared utilities and types
├── docs/                 # Documentation
└── tests/                # Test files
```

## Quick Start

### Prerequisites
- Node.js >= 16.x
- npm or yarn
- SQLite3

### Installation

```bash
# Clone the repository
git clone https://github.com/CR-Akshay/ai-bot-studio.git
cd ai-bot-studio

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Usage

### Create a New Bot

1. Navigate to "Create Bot"
2. Enter bot name and description
3. Define system prompt and parameters
4. Configure AI provider settings
5. Save and test your bot

### Link Bots in a Project

1. Create or select a project
2. Add bots to the project
3. Define bot interaction flows
4. Configure data sharing between bots
5. Test the complete workflow

### Share & Upload

1. Export your project
2. Share via cloud storage or direct link
3. Upload outputs to configured services
4. Monitor sync status

## API Endpoints

### Bots
- `POST /api/bots` - Create new bot
- `GET /api/bots` - List all bots
- `GET /api/bots/:id` - Get bot details
- `PUT /api/bots/:id` - Update bot
- `DELETE /api/bots/:id` - Delete bot

### Projects
- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Sharing
- `POST /api/share/export` - Export project
- `POST /api/share/upload` - Upload outputs
- `GET /api/share/status` - Check sync status

## Technology Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: React, Redux, Tailwind CSS
- **Desktop**: Electron
- **Database**: SQLite with encryption
- **API Integration**: OpenAI, Anthropic, Hugging Face

## Environment Variables

```env
# API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
HUGGINGFACE_API_KEY=

# Server
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./data/bots.db
DB_ENCRYPTION_KEY=

# Storage
STORAGE_PATH=./data/storage
MAX_FILE_SIZE=104857600

# Cloud Integration
AWS_BUCKET=
AWS_REGION=
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Support for more AI providers
- [ ] Advanced bot workflow builder
- [ ] Real-time collaboration
- [ ] Bot performance analytics
- [ ] Mobile app support
- [ ] Community bot marketplace

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@aibotsstudio.com or open an issue on GitHub.

## Authors

- **CR-Akshay** - Initial work

---

Made with ❤️ by AI Bot Studio Team
