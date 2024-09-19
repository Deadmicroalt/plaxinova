const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const paypal = require('paypal-rest-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('./config/config.json');

const app = express();
const port = 3000;

paypal.configure({
    mode: 'sandbox',
    client_id: config.paypal.clientId,
    client_secret: config.paypal.clientSecret
});

mongoose.connect(config.mongodbUri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' }
});

const serverSchema = new mongoose.Schema({
    userId: String,
    name: String,
    memory: Number,
    ram: Number,
    consoleLogs: [String],
    files: [{ name: String, content: String }],
    allocations: [String]
});

const User = mongoose.model('User', userSchema);
const Server = mongoose.model('Server', serverSchema);

app.use(bodyParser.json());
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public'));

// Create an admin account if it doesn't exist
User.findOne({ username: 'admin' }, async (err, admin) => {
    if (!admin) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        const newAdmin = new User({ username: 'admin', email: 'admin@example.com', password: hashedPassword, role: 'admin' });
        await newAdmin.save();
    }
});

// Registration endpoint
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });

    try {
        await user.save();
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Middleware to check if user is logged in
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

// Middleware to check if user is an admin
function checkAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}

// Protected route
app.get('/dashboard', checkAuth, (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Get user's servers
app.get('/servers', checkAuth, async (req, res) => {
    const servers = await Server.find({ userId: req.session.user._id });
    res.json({ servers });
});

// Create a server
app.post('/servers', checkAuth, async (req, res) => {
    const { name, memory, ram } = req.body;
    const newServer = new Server({
        userId: req.session.user._id,
        name,
        memory,
        ram,
        consoleLogs: [],
        files: [],
        allocations: []
    });
    await newServer.save();
    res.json(newServer);
});

// Start a server
app.post('/servers/:id/start', checkAuth, async (req, res) => {
    // Add logic to start the server
    res.sendStatus(200);
});

// Stop a server
app.post('/servers/:id/stop', checkAuth, async (req, res) => {
    // Add logic to stop the server
    res.sendStatus(200);
});

// Restart a server
app.post('/servers/:id/restart', checkAuth, async (req, res) => {
    // Add logic to restart the server
    res.sendStatus(200);
});

// View server files
app.get('/servers/:id/files', checkAuth, async (req, res) => {
    const server = await Server.findById(req.params.id);
    if (server.userId === req.session.user._id) {
        res.json(server.files);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// Edit server files
app.post('/servers/:id/files', checkAuth, async (req, res) => {
    const { files } = req.body;
    const server = await Server.findById(req.params.id);
    if (server.userId === req.session.user._id) {
        server.files = files;
        await server.save();
        res.sendStatus(200);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// View server allocations
app.get('/servers/:id/allocations', checkAuth, async (req, res) => {
    const server = await Server.findById(req.params.id);
    if (server.userId === req.session.user._id) {
        res.json(server.allocations);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});

// PayPal payment
app.post('/create-payment', checkAuth, async (req, res) => {
    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Minecraft Server Hosting",
                    "sku": "001",
                    "price": "10.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "10.00"
            },
            "description": "Payment for Minecraft server hosting."
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for (let i = 0; i < payment.links.length; i++) {
                if (payment.links[i].rel === 'approval_url') {
                    res.json({ forwardLink: payment.links[i].href });
                }
            }
        }
    });
});

// PayPal success
app.get('/success', (req, res) => {
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "USD",
                "total": "10.00"
            }
        }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response);
            throw error;
        } else {
            console.log(JSON.stringify(payment));
            res.send('Success');
        }
    });
});

// PayPal cancel
app.get('/cancel', (req, res) => res.send('Cancelled'));

// Admin route
app.get('/admin', checkAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
