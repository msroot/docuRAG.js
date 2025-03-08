import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { DocuRAG } from '../index.js';

// Initialize express app with security defaults
const app = express();

// Initialize DocuRAG instance with production configuration
// Ensure these URLs are configured via environment variables in production
const docuRAG = new DocuRAG({
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    llmUrl: process.env.LLM_URL || 'http://localhost:11434'
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

// Middleware setup with security headers
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || '*', // Configure allowed origins in production
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', {
    maxAge: '1h',
    etag: true
}));

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

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Use the chat method with streaming callbacks
        await docuRAG.chat(message, {
            onData: (data) => {
                try {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    console.error('Error writing data:', error);
                }
            },
            onEnd: () => {
                try {
                    res.write('data: [DONE]\n\n');
                    res.end();
                } catch (error) {
                    console.error('Error ending response:', error);
                }
            },
            onError: (error) => {
                try {
                    res.write(`data: ${JSON.stringify({ success: false, error })}\n\n`);
                    res.end();
                } catch (error) {
                    console.error('Error sending error:', error);
                }
            }
        });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing your request' });
        } else {
            try {
                res.write(`data: ${JSON.stringify({ success: false, error: error.message })}\n\n`);
                res.end();
            } catch (e) {
                console.error('Error sending error response:', e);
            }
        }
    }
});

app.post('/cleanup', async (req, res) => {
    try {
        await docuRAG.cleanup();
        res.json({ success: true, message: 'Cleanup completed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 