import axios from 'axios';
import pdfParse from 'pdf-parse';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { v4 as uuidv4 } from 'uuid';

export class DocuRAG {
    constructor(config = {}) {
        this.config = {
            // Default configuration
            qdrantUrl: 'http://localhost:6333',
            vectorSize: 3072,
            vectorDistance: 'Cosine',
            llmUrl: 'http://localhost:11434',
            llmModel: 'llama3.2',
            chunkSize: 1000,
            chunkOverlap: 200,
            searchLimit: 3,
            ...config
        };

        // Initialize clients and tools
        this.qdrant = new QdrantClient({ url: this.config.qdrantUrl });
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: this.config.chunkSize,
            chunkOverlap: this.config.chunkOverlap,
            lengthFunction: (text) => text.length,
        });

        // Track current active collection
        this.currentCollection = null;
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

    async processPDFBuffer(pdfBuffer, fileName) {
        try {
            // Clean up existing collection if any
            if (this.currentCollection) {
                try {
                    await this.qdrant.deleteCollection(this.currentCollection.collectionName);
                } catch (error) {
                    console.error(`Error deleting collection ${this.currentCollection.collectionName}:`, error);
                }
            }

            const docName = fileName.replace('.pdf', '').replace(/[^a-zA-Z0-9]/g, '_');
            const timestamp = Date.now();
            const collectionName = `${docName}_${timestamp}`;
            
            await this.createCollection(collectionName);
            
            const pdfContent = await this.readPDFContent(pdfBuffer);
            
            await this.addToVectorStore(pdfContent, {
                fileName: fileName,
                collectionName: collectionName
            });

            // Store current collection info
            this.currentCollection = {
                fileName: fileName,
                collectionName: collectionName
            };

            return { collectionName };
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw error;
        }
    }

    async chat(message, callbacks = null) {
        if (!this.currentCollection) {
            throw new Error('No document has been processed yet');
        }

        const relevantChunks = await this.searchVectorStore(this.currentCollection.collectionName, message);
        const prompt = this.createChatPrompt(relevantChunks, message);
        const sources = relevantChunks.map(chunk => ({
            fileName: chunk.fileName,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text.substring(0, 150) + '...'
        }));

        const requestConfig = {
            model: this.config.llmModel,
            prompt: prompt,
            ...(callbacks && { stream: true })
        };

        try {
            if (!callbacks) {
                const { data } = await axios.post(`${this.config.llmUrl}/api/generate`, requestConfig);
                return { success: true, response: data.response, sources };
            }

            const { data } = await axios.post(`${this.config.llmUrl}/api/generate`, requestConfig, {
                responseType: 'stream'
            });

            data.on('data', chunk => {
                const lines = chunk.toString().split('\n').filter(Boolean);
                lines.forEach(line => {
                    try {
                        const { response } = JSON.parse(line);
                        if (response) {
                            callbacks.onData({ success: true, response, sources });
                        }
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                });
            });

            data.on('end', () => callbacks.onEnd?.());
            data.on('error', error => {
                console.error('Stream error:', error);
                callbacks.onError?.('Error processing your request');
            });
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.currentCollection) {
                await this.qdrant.deleteCollection(this.currentCollection.collectionName);
                this.currentCollection = null;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error in cleanup:', error);
            throw error;
        }
    }

    createChatPrompt(relevantChunks, userMessage) {
        const context = relevantChunks.map(chunk => chunk.text).join('\n\n');
        return `Context from document:
${context}

Question: ${userMessage}

Response Guidelines:
• Format your response using bullet points when listing multiple items
• Keep answers clear and professional
• Focus on key information from the provided context
• Use markdown formatting for emphasis when needed
• If information isn't in the context, respond: "This information is not found in the provided document."`;
    }
} 