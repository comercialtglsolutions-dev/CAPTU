import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import leadRoutes from './routes/leads'; // Lead routes module

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/leads', leadRoutes);

app.get('/', (req, res) => {
    res.send('CAPTU Backend API is running');
});

// Export the Express API
export default app;

// Start the server only if run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
