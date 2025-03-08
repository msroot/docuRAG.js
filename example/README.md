# DocuRAG.js Example

Server implementation example with UI for DocuRAG.js.

## Prerequisites
- Node.js 18+
- Docker (for Qdrant)
- Ollama

## Quick Start

1. Start required services:
```bash
# Start Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Start Ollama with Llama2
ollama run llama2
```

2. Run the server:
```bash
npm run start
# Open http://localhost:3000
```