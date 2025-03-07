const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();



// Configuration Variables
const CONFIG = {
    // Server Configuration
    PORT: process.env.PORT || 3000,

    // Qdrant Configuration
    QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
    VECTOR_SIZE: 3072,
    VECTOR_DISTANCE: 'Cosine',

    // LLM Configuration
    LLM_URL: process.env.LLM_URL || 'http://localhost:11434',
    LLM_MODEL: process.env.LLM_MODEL || 'llama3.2',
    
    // Text Splitting Configuration
    CHUNK_SIZE: 1000,
    CHUNK_OVERLAP: 200,
    
    // Search Configuration
    SEARCH_LIMIT: 3
};

// Prompt template for chat responses
const CHAT_PROMPT_TEMPLATE = `You are a helpful AI assistant that answers questions about PDF documents. You have access to the following relevant sections from the PDF:

\${relevantChunks.join('\n\n')}

Question: \${message}

Please provide a clear, concise, and accurate answer based on the PDF content. If the information is not present in the provided sections, please say "I cannot find this information in the PDF." If you need more context to provide a complete answer, please mention that as well.

Format your response in a clear, engaging way:
• Use bullet points (•) for listing items or key points
• Break down complex information into digestible paragraphs
• Use markdown-style formatting:
  - Bold for important terms or key concepts
  - Separate distinct topics with line breaks
  - Use numbered lists for sequential information

Your response should be:
1. Direct and to the point
2. Based only on the information from the PDF
3. Well-structured and easy to read

Remember to maintain a conversational yet professional tone.`;


const app = express();

// Initialize Qdrant client
const qdrant = new QdrantClient({ url: CONFIG.QDRANT_URL });

// Store active sessions with their collection names
const sessions = new Map();

// Function to get embeddings from local LLM
async function getEmbeddings(text) {
    try {
        const response = await axios.post(`${CONFIG.LLM_URL}/api/embeddings`, {
            model: CONFIG.LLM_MODEL,
            prompt: text
        });
        return response.data.embedding;
    } catch (error) {
        console.error('Error getting embeddings:', error);
        throw error;
    }
}

// Initialize text splitter
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CONFIG.CHUNK_SIZE,
    chunkOverlap: CONFIG.CHUNK_OVERLAP,
    lengthFunction: (text) => text.length,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for PDF upload (in-memory only)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Function to read PDF content
async function readPDFContent(pdfBuffer) {
    try {
        const data = await pdfParse(pdfBuffer);
        return data.text;
    } catch (error) {
        console.error('Error reading PDF:', error);
        throw error;
    }
}

// Function to create a new collection
async function createCollection(collectionName) {
    try {
        await qdrant.createCollection(collectionName, {
            vectors: {
                size: CONFIG.VECTOR_SIZE,
                distance: CONFIG.VECTOR_DISTANCE
            }
        });
    } catch (error) {
        console.error('Error creating collection:', error);
        throw error;
    }
}

// Function to add documents to vector store
async function addToVectorStore(text, metadata) {
    try {
        // Split text into chunks
        const chunks = await textSplitter.splitText(text);
        
        // Generate embeddings for chunks
        const vectors = await Promise.all(
            chunks.map(async (chunk, index) => {
                const embedding = await getEmbeddings(chunk);
                return {
                    id: uuidv4(),
                    vector: embedding,
                    payload: {
                        text: chunk,
                        fileName: metadata.fileName,
                        chunkIndex: index
                    }
                };
            })
        );

        // Upsert vectors to Qdrant
        await qdrant.upsert(metadata.collectionName, {
            points: vectors
        });

        return vectors.length;
    } catch (error) {
        console.error('Error adding to vector store:', error);
        throw error;
    }
}

// Function to search vector store
async function searchVectorStore(collectionName, query) {
    try {
        const queryEmbedding = await getEmbeddings(query);
        
        const searchResult = await qdrant.search(collectionName, {
            vector: queryEmbedding,
            limit: CONFIG.SEARCH_LIMIT
        });

        return searchResult.map(result => ({
            text: result.payload.text,
            fileName: result.payload.fileName,
            chunkIndex: result.payload.chunkIndex
        }));
    } catch (error) {
        console.error('Error searching vector store:', error);
        throw error;
    }
}

// Function to generate a unique session ID
function generateSessionId() {
    return uuidv4();
}

// Function to create prompt from chunks and message
function createChatPrompt(relevantChunks, message) {
    return CHAT_PROMPT_TEMPLATE
        .replace('\${relevantChunks.join(\'\n\n\')}', relevantChunks.map(chunk => chunk.text).join('\n\n'))
        .replace('\${message}', message);
}

// Routes
app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        // Get document name without .pdf extension and create collection name
        const docName = req.file.originalname.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = Date.now();
        const collectionName = `${docName}_${timestamp}`;
        
        // Create new collection for this document
        await createCollection(collectionName);
        
        // Read PDF content from buffer
        const pdfContent = await readPDFContent(req.file.buffer);
        
        // Add to vector store
        await addToVectorStore(pdfContent, {
            fileName: req.file.originalname,
            collectionName: collectionName
        });

        // Create new session
        const sessionId = generateSessionId();
        sessions.set(sessionId, { 
            collections: [{
                fileName: req.file.originalname,
                collectionName: collectionName
            }]
        });

        res.json({ 
            success: true, 
            sessionId,
            message: 'PDF processed successfully'
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        const session = sessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        let relevantChunks;
        // If there's only one collection, use it
        if (session.collections.length === 1) {
            relevantChunks = await searchVectorStore(session.collections[0].collectionName, message);
        } else if (session.collections.length > 1) {
            // If multiple collections, search in all of them and combine results
            const allChunks = await Promise.all(
                session.collections.map(collection => 
                    searchVectorStore(collection.collectionName, message)
                )
            );
            relevantChunks = allChunks.flat();
        } else {
            return res.status(400).json({ error: 'No documents found in session' });
        }

        // Create prompt using the template
        const prompt = createChatPrompt(relevantChunks, message);

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send to LLM with streaming enabled
        const response = await axios.post(`${CONFIG.LLM_URL}/api/generate`, {
            model: CONFIG.LLM_MODEL,
            prompt: prompt,
            stream: true
        }, {
            responseType: 'stream'
        });

        // Stream the response
        response.data.on('data', chunk => {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        res.write(`data: ${JSON.stringify({ 
                            success: true, 
                            response: data.response,
                            sources: relevantChunks.map(chunk => ({
                                fileName: chunk.fileName,
                                chunkIndex: chunk.chunkIndex,
                                text: chunk.text.substring(0, 150) + '...'
                            }))
                        })}\n\n`);
                    }
                } catch (e) {
                    console.error('Error parsing chunk:', e);
                }
            }
        });

        response.data.on('end', () => {
            res.end();
        });

        response.data.on('error', error => {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ success: false, error: 'Error processing your request' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing your request' });
        }
    }
});

// Cleanup endpoint for session management
app.post('/cleanup', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = sessions.get(sessionId);

        if (session) {
            // Delete all collections for this session
            await Promise.all(session.collections.map(async (collection) => {
                try {
                    await qdrant.deleteCollection(collection.collectionName);
                } catch (error) {
                    console.error(`Error deleting collection ${collection.collectionName}:`, error);
                }
            }));
            
            // Remove session
            sessions.delete(sessionId);
            
            res.json({ success: true, message: 'Session cleaned up successfully' });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(CONFIG.PORT, () => {
    console.log(`Server running at http://localhost:${CONFIG.PORT}`);
    console.log('Configuration:');
    console.log('- Qdrant URL:', CONFIG.QDRANT_URL);
    console.log('- LLM URL:', CONFIG.LLM_URL);
    console.log('- LLM Model:', CONFIG.LLM_MODEL);
}); 