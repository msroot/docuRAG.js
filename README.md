# docuRAG.js 🤖

A modern, interactive web application that allows users to chat with their PDF documents using RAG (Retrieval-Augmented Generation) and LLM technology.

## ✨ Features

- **PDF Processing**: Upload and process PDF documents with ease
- **Interactive Chat**: Have natural conversations about your PDF content
- **Real-time Responses**: Stream responses as they're generated
- **Modern UI**: Clean, responsive interface with beautiful animations
- **Markdown Support**: Well-formatted responses with support for:
  - Bold text and headers
  - Bullet points and numbered lists
  - Block quotes
  - Code snippets
- **File Management**: 
  - Drag & drop file upload
  - PDF preview
  - Session management
  - Automatic cleanup

## 🛠️ Technology Stack

- **Frontend**:
  - HTML5/CSS3
  - Vanilla JavaScript
  - Server-Sent Events (SSE) for streaming
  - Marked.js for markdown rendering
  - Inter font family

- **Backend**:
  - Node.js & Express
  - Qdrant Vector Database
  - Local LLM integration
  - PDF parsing capabilities

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Docker (for Qdrant)
- Ollama

### Step 1: Install Qdrant Vector Database

1. Install and run Qdrant using Docker:
   ```bash
   docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
   ```

2. Verify Qdrant is running:
   - REST API will be available at `http://localhost:6333`
   - Web UI will be available at `http://localhost:6334`

### Step 2: Install and Setup Ollama

1. Download and install Ollama:
   - Visit [Ollama Download Page](https://ollama.com/download)
   - Follow the installation instructions for your OS
   - For macOS: requires macOS 11 Big Sur or later

2. Pull and run the LLama model:
   ```bash
   ollama run llama3.2
   ```
   This will:
   - Download the model if not present
   - Start the Ollama server on `http://localhost:11434`

### Step 3: Install docuRAG.js

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/docuRAG.js.git
   cd docuRAG.js
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Verify Installation

Ensure all components are running:
1. Qdrant UI should be accessible at `http://localhost:6334`
2. Ollama should be running with llama3.2 model
3. docuRAG.js server should be running on `http://localhost:3000`

## 💡 Usage

1. **Upload a PDF**:
   - Drag and drop a PDF file onto the upload zone
   - Or click the file icon to browse your files

2. **Chat with your PDF**:
   - Wait for the PDF to be processed
   - Type your question in the chat input
   - Get AI-powered responses based on your document's content

3. **Reset Session**:
   - Click the Reset button to clear the current session
   - Upload a new PDF to start a fresh conversation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Built by [Yannis Kolovos](http://msroot.me/) 