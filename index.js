import axios from 'axios';
import pdfParse from 'pdf-parse';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';

export class DocuRAG {
    constructor(config = {}) {
        this.config = {
            // Qdrant Configuration
            qdrantUrl: config.qdrantUrl || 'http://localhost:6333',
            vectorSize: config.vectorSize || 3072,
            vectorDistance: config.vectorDistance || 'Cosine',

            // LLM Configuration
            llmUrl: config.llmUrl || 'http://localhost:11434',
            llmModel: config.llmModel || 'llama3.2',
            
            // Text Splitting Configuration
            chunkSize: config.chunkSize || 1000,
            chunkOverlap: config.chunkOverlap || 200,
            
            // Search Configuration
            searchLimit: config.searchLimit || 3
        };

        // Initialize clients and tools
        this.qdrant = new QdrantClient({ url: this.config.qdrantUrl });
        this.sessions = new Map();
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap,
            lengthFunction: (text) => text.length,
        });
    }

    async getEmbeddings(text) {
        try {
            const response = await axios.post(`${this.config.llmUrl}/api/embeddings`, {
                model: this.config.llmModel,
                prompt: text
            });
            return response.data.embedding;
        } catch (error) {
            console.error('Error getting embeddings:', error);
            throw error;
        }
    }

    async readPDFContent(pdfBuffer) {
        try {
            const data = await pdfParse(pdfBuffer);
            return data.text;
        } catch (error) {
            console.error('Error reading PDF:', error);
            throw error;
        }
    }

    async createCollection(collectionName) {
        try {
            await this.qdrant.createCollection(collectionName, {
                vectors: {
                    size: this.config.vectorSize,
                    distance: this.config.vectorDistance
                }
            });
        } catch (error) {
            console.error('Error creating collection:', error);
            throw error;
        }
    }

    async addToVectorStore(text, metadata) {
        try {
            const chunks = await this.textSplitter.splitText(text);
            
            const vectors = await Promise.all(
                chunks.map(async (chunk, index) => {
                    const embedding = await this.getEmbeddings(chunk);
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

            await this.qdrant.upsert(metadata.collectionName, {
                points: vectors
            });

            return vectors.length;
        } catch (error) {
            console.error('Error adding to vector store:', error);
            throw error;
        }
    }

    async searchVectorStore(collectionName, query) {
        try {
            const queryEmbedding = await this.getEmbeddings(query);
            
            const searchResult = await this.qdrant.search(collectionName, {
                vector: queryEmbedding,
                limit: this.config.searchLimit
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

    generateSessionId() {
        return uuidv4();
    }

    async processPDFBuffer(pdfBuffer, fileName) {
        try {
            const sessionId = this.generateSessionId();
            const docName = fileName.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = Date.now();
            const collectionName = `${docName}_${timestamp}`;
            
            // Clean up any existing collections for this session if they exist
            const existingSession = this.sessions.get(sessionId);
            if (existingSession) {
                await Promise.all(existingSession.collections.map(async (collection) => {
                    try {
                        await this.qdrant.deleteCollection(collection.collectionName);
                    } catch (error) {
                        console.error(`Error deleting collection ${collection.collectionName}:`, error);
                    }
                }));
            }
            
            await this.createCollection(collectionName);
            
            const pdfContent = await this.readPDFContent(pdfBuffer);
            
            await this.addToVectorStore(pdfContent, {
                fileName: fileName,
                collectionName: collectionName
            });

            // Set new session with single collection
            this.sessions.set(sessionId, { 
                collections: [{
                    fileName: fileName,
                    collectionName: collectionName
                }]
            });

            return { sessionId };
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw error;
        }
    }

    async chat(sessionId, message, callbacks = null) {
        try {
            const session = this.sessions.get(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            let relevantChunks;
            if (session.collections.length === 1) {
                relevantChunks = await this.searchVectorStore(session.collections[0].collectionName, message);
            } else if (session.collections.length > 1) {
                const allChunks = await Promise.all(
                    session.collections.map(collection => 
                        this.searchVectorStore(collection.collectionName, message)
                    )
                );
                relevantChunks = allChunks.flat();
            } else {
                throw new Error('No documents found in session');
            }

            const prompt = this.createChatPrompt(relevantChunks, message);

            if (callbacks) {
                // Streaming mode
                const response = await axios.post(`${this.config.llmUrl}/api/generate`, {
                    model: this.config.llmModel,
                    prompt: prompt,
                    stream: true
                }, {
                    responseType: 'stream'
                });

                response.data.on('data', chunk => {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);
                            if (data.response) {
                                callbacks.onData({
                                    success: true,
                                    response: data.response,
                                    sources: relevantChunks.map(chunk => ({
                                        fileName: chunk.fileName,
                                        chunkIndex: chunk.chunkIndex,
                                        text: chunk.text.substring(0, 150) + '...'
                                    }))
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                });

                response.data.on('end', () => {
                    if (callbacks.onEnd) callbacks.onEnd();
                });

                response.data.on('error', error => {
                    console.error('Stream error:', error);
                    if (callbacks.onError) callbacks.onError('Error processing your request');
                });
            } else {
                // Non-streaming mode
                const response = await axios.post(`${this.config.llmUrl}/api/generate`, {
                    model: this.config.llmModel,
                    prompt: prompt
                });

                return {
                    success: true,
                    response: response.data.response,
                    sources: relevantChunks.map(chunk => ({
                        fileName: chunk.fileName,
                        chunkIndex: chunk.chunkIndex,
                        text: chunk.text.substring(0, 150) + '...'
                    }))
                };
            }
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }

    async cleanup(sessionId) {
        try {
            const session = this.sessions.get(sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            await Promise.all(session.collections.map(async (collection) => {
                try {
                    await this.qdrant.deleteCollection(collection.collectionName);
                } catch (error) {
                    console.error(`Error deleting collection ${collection.collectionName}:`, error);
                }
            }));
            
            this.sessions.delete(sessionId);
            return true;
        } catch (error) {
            console.error('Error in cleanup:', error);
            throw error;
        }
    }

    createChatPrompt(relevantChunks, userMessage) {
        const context = relevantChunks.map(chunk => chunk.text).join('\n\n');
        return `You are a helpful AI assistant. Use the following context to answer the user's question.
If you cannot find the answer in the context, say so - do not make up information.

Context:
${context}

User Question: ${userMessage}
`;
    }
} 