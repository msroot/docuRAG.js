# docuRAG.js

An open-source Node.js library for building RAG-powered PDF question-answering systems. docuRAG.js provides a complete solution for implementing Retrieval-Augmented Generation using Qdrant vector database and Ollama's LLM API.

## Library Features

### Core Functionality
- PDF text extraction and processing
- Document chunking and embedding generation
- Vector similarity search with Qdrant
- LLM-based response generation with Llama2
- Real-time streaming responses
- Voice input support

### Technical Capabilities
- Configurable chunking strategies
- Customizable embedding generation
- Extensible vector store integration
- Flexible LLM prompt engineering
- Session-based document management
- Server-Sent Events implementation

## Technical Overview

### Core Components
- **Frontend**: HTML5, CSS3, Vanilla JavaScript for the client interface
- **Backend**: Node.js/Express server for request handling
- **Vector Store**: Qdrant for embedding storage and similarity search
- **LLM Integration**: Ollama API with Llama2 for text generation
- **Document Processing**: PDF parsing and chunking with vector embedding

### Key Features
- Document chunking and embedding generation
- Vector similarity search for context retrieval
- Streaming response generation
- Voice input processing
- Server-Sent Events for real-time communication
- Session-based document management

## Implementation Setup

### System Requirements
- Node.js >= 14
- Docker for Qdrant container
- macOS v11+ (Big Sur) or compatible OS for Ollama
- 8GB RAM minimum recommended

### Vector Database Setup
```bash
# Run Qdrant using Docker
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant

# Verify installation
curl http://localhost:6333/collections  # REST API
# Web UI available at http://localhost:6334
```

### LLM Configuration
```bash
# Install Ollama from https://ollama.ai/download
# Pull Llama model (tested with llama3.2)
ollama run llama3.2

# Verify installation
curl http://localhost:11434/api/tags
```

### Application Setup
```bash
# Clone repository
git clone https://github.com/msroot/docuRAG.js.git
cd docuRAG.js

# Install dependencies
npm install

# Configure environment
cat > .env << EOL
PORT=3000
QDRANT_URL=http://localhost:6333
LLM_URL=http://localhost:11434
LLM_MODEL=llama3.2
EOL

# Start server
npm start
```

## Technical Architecture

### Document Processing Pipeline
- PDF text extraction using pdf-parse
- Text chunking with 1000-token size and 200-token overlap
- Embedding generation via Ollama API
- Vector storage in Qdrant collections

### Query Processing
- Question embedding generation
- Top-K similarity search (default K=3)
- Context-based response generation
- Real-time response streaming

## Development and Contributing

Areas for technical contributions:
- Performance optimization strategies
- Alternative embedding implementations
- Enhanced chunking algorithms
- Additional vector store integrations
- Improved prompt engineering

## License

MIT License - see [LICENSE](LICENSE)

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Ollama API Reference](https://ollama.ai/docs)
- [LangChain Text Splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)

---

Developed by [Yannis Kolovos](http://msroot.me/) 