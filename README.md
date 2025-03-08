# docuRAG.js

A modern Node.js library for building RAG-powered document question-answering systems. docuRAG.js provides a streamlined solution for implementing Retrieval-Augmented Generation using Qdrant vector database and local LLM integration.

![docuRAG.js Demo](https://raw.githubusercontent.com/msroot/docuRAG.js/main/docs/demo.gif)

## Core Features

- **PDF Processing**: Automatic PDF text extraction and chunking
- **Vector Storage**: Seamless integration with Qdrant for embedding storage
- **LLM Integration**: Flexible local LLM support with streaming responses
- **Session Management**: Built-in session handling for document contexts
- **Framework Agnostic**: Can be used with any Node.js framework
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

// Initialize DocuRAG
const docuRAG = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434'
});

// Process a PDF buffer
const { sessionId } = await docuRAG.processPDFBuffer(pdfBuffer, fileName);

// Chat with streaming
await docuRAG.chat(sessionId, "What is this document about?", {
    onData: (data) => console.log(data.response),
    onEnd: () => console.log("Done"),
    onError: (error) => console.error(error)
});

// Or chat without streaming
const response = await docuRAG.chat(sessionId, "What is this document about?");
console.log(response);

// Clean up when done
await docuRAG.cleanup(sessionId);
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

## Example Implementation

Check out the [example](./example) directory for a complete Express.js implementation with:
- Beautiful UI with drag & drop
- Real-time chat with streaming
- Voice input support
- PDF preview
- Source citations

To run the example:
```bash
cd example
npm install
npm start
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
- [Ollama](https://ollama.ai/)
- [LLama2](https://ai.meta.com/llama/)

---
Built with ❤️ by [Yannis Kolovos](http://msroot.me/) 