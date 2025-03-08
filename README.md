# docuRAG.js

💡 Chat with your PDF documents

A JavaScript library for building RAG-powered document question-answering systems. 
docuRAG.js provides a streamlined solution for implementing Retrieval-Augmented Generation using Qdrant vector database and local LLM integration.



![docuRAG.js Demo](https://raw.githubusercontent.com/msroot/docuRAG.js/main/docs/demo.gif)

## Core Features

- **LLM Integration**: Flexible local LLM support with streaming responses
- **Vector Storage**: Qdrant integration for vector similarity search
- **Text Processing**: RecursiveCharacterTextSplitter from LangChain
- **Streaming Responses**: Server-Sent Events (SSE) for real-time chat responses
- **PDF Processing**: Automatic PDF text extraction and chunking
- **Session Management**: Built-in session handling for document contexts
- **Framework Agnostic**: Can be used with any Node.js framework


## Quick Start

### Prerequisites
- Modern JavaScript runtime (Node.js 18+ for server-side)
- Running Qdrant instance
- Local LLM server (e.g., Ollama with Llama2)
  > ⚠️ Note: Currently tested and optimized for Llama2. Other models may work but are not officially supported.

### Setup
```bash
# Start Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Start Llama2
ollama run llama2

# Install docuRAG
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

// Clean up when done
await docuRAG.cleanup(sessionId);
```

## Configuration Options

```javascript
{
    // Vector Store Configuration
    qdrantUrl: string,      // Qdrant server URL
    vectorSize: number,     // Default: 3072
    vectorDistance: string, // Default: 'Cosine'

    // LLM Configuration
    llmUrl: string,        // LLM server URL
    llmModel: string,      // Default: 'llama3.2'

    // Text Processing
    chunkSize: number,     // Default: 1000
    chunkOverlap: number,  // Default: 200

    // Search Configuration
    searchLimit: number    // Default: 3
}
```


## Examples
- [Express Example](./examples/express) - Complete implementation with UI
- [NestJS Example](./examples/nest) - Same features, NestJS implementation


## Contributing

Areas for contribution:
- Additional vector store integrations
- Alternative LLM providers
- Enhanced chunking strategies
- Performance optimizations
- Testing infrastructure

## License

MIT License - see [LICENSE](LICENSE)

## Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [LangChain JS](https://js.langchain.com/)
- [Ollama](https://ollama.ai/)
- [LLama2](https://ai.meta.com/llama/)

---
Built with ❤️ by [Yannis Kolovos](http://msroot.me/) 