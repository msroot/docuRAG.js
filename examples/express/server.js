import express from 'express';
import multer from 'multer';
import { DocuRAG } from '../../index.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app with security defaults
const app = express();

// Middleware setup with security headers
app.use(cors());
app.use(express.json());  // Add this BEFORE routes
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DocuRAG instance with production configuration
// Ensure these URLs are configured via environment variables in production
const docuRAG = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434'
});

// Configure multer for secure PDF upload
// Limit file size to 10MB and only allow PDFs
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only allow one file per request
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Routes
app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        // Validate file presence
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No PDF file uploaded'
            });
        }

        // Extract file data and process PDF
        const { buffer, originalname } = req.file;
        const result = await docuRAG.processPDFBuffer(buffer, originalname);
        
        // Validate processing result
        if (!result) {
            throw new Error('PDF processing failed');
        }

        // Return success response
        res.json({ 
            success: true,
            message: 'PDF processed successfully'
        });
    } catch (error) {
        // Log error for monitoring but send sanitized message to client
        console.error('PDF processing error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to process PDF file'
        });
    }
});

// Chat endpoint with Server-Sent Events (SSE)
// Handles real-time chat interactions with the processed PDF
app.post('/chat', async (req, res) => {
    try {
        // Validate request body
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid request body'
            });
        }

        const { message } = req.body;

        // Validate message
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Message is required and must be a string'
            });
        }

        // Configure SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream chat response with error handling
        await docuRAG.chat(message, {
            onData: (data) => {
                try {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    console.error('Stream write error:', error);
                    res.write(`data: ${JSON.stringify({ 
                        success: false, 
                        error: 'Error streaming response' 
                    })}\n\n`);
                    res.end();
                }
            },
            onEnd: () => {
                try {
                    res.write('data: [DONE]\n\n');
                    res.end();
                } catch (error) {
                    console.error('Stream end error:', error);
                }
            },
            onError: (error) => {
                console.error('Chat processing error:', error);
                res.write(`data: ${JSON.stringify({ 
                    success: false, 
                    error: 'Failed to process chat message' 
                })}\n\n`);
                res.end();
            }
        });
    } catch (error) {
        console.error('Chat endpoint error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to process chat message' 
            });
        }
    }
});

// Cleanup endpoint
// Handles cleanup of processed documents and associated resources
app.post('/cleanup', async (req, res) => {
    try {
        await docuRAG.cleanup();
        res.json({ 
            success: true, 
            message: 'Resources cleaned up successfully' 
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cleanup resources' 
        });
    }
});

// Start server with proper error handling
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Performing graceful shutdown...');
    server.close(async () => {
        await docuRAG.cleanup();
        process.exit(0);
    });
}); 