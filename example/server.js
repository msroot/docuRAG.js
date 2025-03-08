import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { DocuRAG } from '../index.js';

// Initialize express app
const app = express();

// Initialize DocuRAG with default configuration
const docuRAG = new DocuRAG({
    qdrantUrl: 'http://localhost:6333',
    llmUrl: 'http://localhost:11434'
});

// Configure multer for PDF upload
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const result = await docuRAG.processPDFBuffer(req.file.buffer, req.file.originalname);
        res.json({ 
            success: true, 
            sessionId: result.sessionId,
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

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Use the chat method with streaming callbacks
        await docuRAG.chat(sessionId, message, {
            onData: (data) => {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            },
            onEnd: () => {
                res.end();
            },
            onError: (error) => {
                res.write(`data: ${JSON.stringify({ success: false, error })}\n\n`);
                res.end();
            }
        });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error processing your request' });
        }
    }
});

app.post('/cleanup', async (req, res) => {
    try {
        const { sessionId } = req.body;
        await docuRAG.cleanup(sessionId);
        res.json({ success: true, message: 'Session cleaned up successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 