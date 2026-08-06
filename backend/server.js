const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        // Allow all origins for seamless frontend deployment testing
        callback(null, true);
    },
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/branches', require('./routes/branchRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/vendors', require('./routes/vendorRoutes'));
app.use('/api/v1/customers', require('./routes/customerRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/v1/grn', require('./routes/grnRoutes'));
app.use('/api/v1/qc', require('./routes/qualityControlRoutes'));
app.use('/api/v1/inventory', require('./routes/inventoryRoutes'));
app.use('/api/v1/production', require('./routes/productionRoutes'));
app.use('/api/v1/sales-orders', require('./routes/salesOrderRoutes'));
app.use('/api/v1/auto-sales', require('./routes/autoSalesRoutes'));
app.use('/api/v1/customer-ledger', require('./routes/customerLedgerRoutes'));
app.use('/api/v1/vendor-ledger', require('./routes/vendorLedgerRoutes'));
app.use('/api/v1/categories', require('./routes/categoryRoutes'));
app.use('/api/v1/item-types', require('./routes/itemTypeRoutes'));

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
