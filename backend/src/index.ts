import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import leadRoutes from './routes/leads';
import campaignRoutes from './routes/campaigns';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);

app.get('/', (req, res) => {
    res.send('CAPTU Backend API is running');
});

// Export the Express API
export default app;

// Start the server only if run directly
// Start the server
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
