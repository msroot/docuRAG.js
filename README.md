# docuRAG.js

A modern Node.js library for building RAG-powered document question-answering systems. docuRAG.js provides a streamlined solution for implementing Retrieval-Augmented Generation using Qdrant vector database and local LLM integration.

## Core Features

- **PDF Processing**: Automatic PDF text extraction and chunking
- **Vector Storage**: Seamless integration with Qdrant for embedding storage
- **LLM Integration**: Flexible local LLM support with streaming responses
- **Session Management**: Built-in session handling for document contexts
- **Middleware Support**: Express-compatible upload middleware
- **Streaming Responses**: Server-Sent Events (SSE) for real-time chat responses

## Technical Architecture

### Document Processing Pipeline
```javascript
const docuRAG = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434',
    llmModel: 'llama3.2'
});
```

- Configurable chunk size (default: 1000 tokens)
- Adjustable chunk overlap (default: 200 tokens)
- Automatic collection management in Qdrant
- Cosine similarity for vector matching
- Configurable search limit for context retrieval

### Core Components

- **Vector Store**: Qdrant for efficient similarity search
- **Text Processing**: RecursiveCharacterTextSplitter from LangChain
- **File Handling**: Multer for PDF upload processing
- **Streaming**: Server-Sent Events for real-time responses
- **Session Management**: In-memory session tracking with cleanup

## Quick Start

### Prerequisites
- Node.js >= 14
- Running Qdrant instance
- Local LLM server (e.g., Ollama)

### Installation

```bash
npm install docurag
```

### Basic Usage

```javascript
import { DocuRAG } from 'docurag';
import express from 'express';

const app = express();
const docuRAG = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434'
});

// File upload endpoint
app.post('/upload', docuRAG.getUploadMiddleware(), async (req, res) => {
    const result = await docuRAG.processPDF(req.file);
    res.json({ sessionId: result.sessionId });
});

// Chat endpoint with streaming
app.post('/chat', async (req, res) => {
    const { sessionId, message } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    await docuRAG.streamChat(sessionId, message, {
        onData: (data) => res.write(`data: ${JSON.stringify(data)}\n\n`),
        onEnd: () => res.end()
    });
});
```

## Configuration Options

```javascript
{
    // Vector Store Configuration
    qdrantUrl: string,      // Qdrant server URL
    vectorSize: number,     // Embedding vector size (default: 3072)
    vectorDistance: string, // Distance metric (default: 'Cosine')

    // LLM Configuration
    llmUrl: string,        // LLM server URL
    llmModel: string,      // Model name (default: 'llama3.2')

    // Text Processing
    chunkSize: number,     // Token chunk size (default: 1000)
    chunkOverlap: number,  // Overlap between chunks (default: 200)

    // Search Configuration
    searchLimit: number    // Context chunks to retrieve (default: 3)
}
```

## API Reference

### DocuRAG Class

#### Constructor
```javascript
new DocuRAG(config?: DocuRAGConfig)
```

#### Methods
- `processPDF(file: Express.Multer.File)`: Process and store PDF document
- `chat(sessionId: string, message: string)`: Get chat response data
- `streamChat(sessionId: string, message: string, callbacks: StreamCallbacks)`: Stream chat responses
- `cleanup(sessionId: string)`: Clean up session resources
- `getUploadMiddleware()`: Get PDF upload middleware

## Development Setup

### Vector Database
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### LLM Server (using Ollama)
```bash
# Install from https://ollama.ai
ollama run llama3.2
```

## Contributing

Areas for contribution:
- Additional vector store integrations
- Alternative LLM providers
- Enhanced chunking strategies
- Performance optimizations
- Testing infrastructure

## License

MIT License - see [LICENSE](LICENSE)

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [LangChain JS](https://js.langchain.com/)
- [Express.js](https://expressjs.com/)
- [Multer](https://github.com/expressjs/multer)

---
Developed by [Yannis Kolovos](http://msroot.me/) 