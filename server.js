const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_canteen';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.log('MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  userType: { type: String, enum: ['student', 'owner'], required: true },
  studentId: { type: String, default: '' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  emoji: { type: String, default: '🍽️' },
  available: { type: Boolean, default: true },
  popular: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  userId: { type: String, required: true },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    emoji: String
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'preparing', 'ready', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  userId: { type: String, required: true },
  timeSlot: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  createdAt: { type: Date, default: Date.now }
});

// Notice Schema
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'closure', 'special'], default: 'info' },
  urgent: { type: Boolean, default: false },
  expiry: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Time Slot Schema
const timeSlotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  label: { type: String, required: true },
  booked: { type: Number, default: 0 },
  total: { type: Number, default: 20 },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Order = mongoose.model('Order', orderSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'campus_canteen_secret_key_2023';

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userType = decoded.userType;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Initialize default data (without demo users)
const initializeData = async () => {
  try {
    // Check if menu items exist
    const menuItemsCount = await MenuItem.countDocuments();
    if (menuItemsCount === 0) {
      const defaultMenuItems = [
        { name: "Grilled Chicken Sandwich", price: 8.99, category: "lunch", description: "Juicy grilled chicken with fresh vegetables", emoji: "🥪", popular: true },
        { name: "Caesar Salad", price: 6.99, category: "lunch", description: "Fresh romaine lettuce with caesar dressing", emoji: "🥗" },
        { name: "Pancakes", price: 5.99, category: "breakfast", description: "Fluffy pancakes with maple syrup", emoji: "🥞", popular: true },
        { name: "Coffee", price: 2.99, category: "beverages", description: "Freshly brewed coffee", emoji: "☕", popular: true },
        { name: "Chocolate Muffin", price: 3.49, category: "snacks", description: "Rich chocolate chip muffin", emoji: "🧁" },
        { name: "Fruit Smoothie", price: 4.99, category: "beverages", description: "Mixed fruit smoothie with yogurt", emoji: "🥤", popular: true }
      ];
      await MenuItem.insertMany(defaultMenuItems);
      console.log('Default menu items created');
    }

    // Check if time slots exist
    const timeSlotsCount = await TimeSlot.countDocuments();
    if (timeSlotsCount === 0) {
      const defaultTimeSlots = [
        { time: '9:00-10:00', label: '9:00 - 10:00 AM' },
        { time: '10:00-11:00', label: '10:00 - 11:00 AM' },
        { time: '11:00-12:00', label: '11:00 - 12:00 PM' },
        { time: '12:00-13:00', label: '12:00 - 1:00 PM' },
        { time: '13:00-14:00', label: '1:00 - 2:00 PM' },
        { time: '14:00-15:00', label: '2:00 - 3:00 PM' }
      ];
      await TimeSlot.insertMany(defaultTimeSlots);
      console.log('Default time slots created');
    }

    // Check if notices exist
    const noticesCount = await Notice.countDocuments();
    if (noticesCount === 0) {
      const defaultNotices = [
        { 
          title: 'Welcome to Campus Canteen!', 
          message: 'Enjoy our fresh meals and convenient online ordering system.', 
          type: 'info' 
        },
        { 
          title: '20% Off Lunch Combos', 
          message: 'Get 20% off on all lunch combo meals this week!', 
          type: 'special' 
        }
      ];
      await Notice.insertMany(defaultNotices);
      console.log('Default notices created');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// Routes

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Campus Canteen API is running!' });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, username, password, userType } = req.body;

    // Validation
    if (!name || !email || !username || !password || !userType) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate student ID if user is student
    let studentId = '';
    if (userType === 'student') {
      studentId = 'STU' + Math.floor(1000 + Math.random() * 9000);
    }

    // Create user
    const user = new User({
      name,
      email,
      username: username.toLowerCase(),
      password: hashedPassword,
      userType,
      studentId
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        studentId: user.studentId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, userType } = req.body;

    // Validation
    if (!username || !password || !userType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user
    const user = await User.findOne({ 
      username: username.toLowerCase(), 
      userType 
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        studentId: user.studentId,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
app.put('/api/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get menu items
app.get('/api/menu', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = { available: true };
    
    if (category && category !== 'all') {
      filter.category = category;
    }

    const menuItems = await MenuItem.find(filter);
    res.json(menuItems);
  } catch (error) {
    console.error('Menu error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get time slots
app.get('/api/time-slots', async (req, res) => {
  try {
    const timeSlots = await TimeSlot.find();
    res.json(timeSlots);
  } catch (error) {
    console.error('Time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get notices
app.get('/api/notices', async (req, res) => {
  try {
    const notices = await Notice.find()
      .sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    console.error('Notices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create booking
app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const { timeSlot } = req.body;

    // Find the time slot
    const slot = await TimeSlot.findOne({ time: timeSlot });
    if (!slot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    // Check availability
    if (slot.booked >= slot.total) {
      return res.status(400).json({ message: 'Time slot is fully booked' });
    }

    // Generate booking ID
    const bookingId = 'BOOK' + Date.now().toString().slice(-6);

    // Create booking
    const booking = new Booking({
      bookingId,
      userId: req.userId,
      timeSlot: slot.label,
      date: new Date().toLocaleDateString()
    });

    // Update slot booked count
    slot.booked += 1;
    await slot.save();
    await booking.save();

    res.status(201).json({ 
      message: 'Booking created successfully', 
      booking 
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create order
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, total } = req.body;

    // Generate order ID
    const orderId = 'ORD' + Date.now().toString().slice(-6);

    // Create order
    const order = new Order({
      orderId,
      userId: req.userId,
      items,
      total
    });

    await order.save();

    res.status(201).json({ 
      message: 'Order created successfully', 
      order 
    });
  } catch (error) {
    console.error('Order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user bookings
app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all orders (for owner)
app.get('/api/admin/orders', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find()
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bookings (for owner)
app.get('/api/admin/bookings', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.find()
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all menu items (for owner)
app.get('/api/admin/menu', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (error) {
    console.error('Admin menu error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add menu item (for owner)
app.post('/api/admin/menu', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, price, category, description, emoji } = req.body;

    const menuItem = new MenuItem({
      name,
      price,
      category,
      description,
      emoji: emoji || '🍽️'
    });

    await menuItem.save();

    res.status(201).json({ 
      message: 'Menu item added successfully', 
      menuItem 
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item (for owner)
app.put('/api/admin/menu/:id', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { available, popular } = req.body;
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { available, popular },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ 
      message: 'Menu item updated successfully', 
      menuItem 
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notice (for owner)
app.post('/api/admin/notices', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, message, type, urgent } = req.body;

    const notice = new Notice({
      title,
      message,
      type,
      urgent: urgent || false
    });

    await notice.save();

    res.status(201).json({ 
      message: 'Notice created successfully', 
      notice 
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (for owner)
app.patch('/api/admin/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body;

    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ 
      message: 'Order status updated successfully', 
      order 
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update time slot capacity (for owner)
app.put('/api/admin/time-slots/capacity', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { capacity } = req.body;

    await TimeSlot.updateMany({}, { total: capacity });
    
    res.json({ message: 'Capacity updated successfully' });
  } catch (error) {
    console.error('Update capacity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats (for owner)
app.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's revenue
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

    // Today's orders count
    const todayOrdersCount = todayOrders.length;

    // Today's bookings count
    const todayBookings = await Booking.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const todayBookingsCount = todayBookings.length;

    // Active notices count
    const activeNoticesCount = await Notice.countDocuments();

    // Popular items
    const popularItems = await MenuItem.find({ popular: true });

    res.json({
      todayRevenue,
      todayOrders: todayOrdersCount,
      todayBookings: todayBookingsCount,
      activeNotices: activeNoticesCount,
      popularItems
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Initialize data and start server
const PORT = process.env.PORT || 5000;

mongoose.connection.once('open', async () => {
  console.log('Connected to MongoDB');
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API URL: http://localhost:${PORT}`);
  });
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Add these routes to your server.js file in the backend

// Get all orders for owner
app.get('/api/admin/orders', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find()
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bookings for owner
app.get('/api/admin/bookings', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bookings = await Booking.find()
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status (for owner)
app.patch('/api/admin/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status } = req.body;

    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ 
      message: 'Order status updated successfully', 
      order 
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all menu items (for owner - includes unavailable items)
app.get('/api/admin/menu', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const menuItems = await MenuItem.find();
    res.json(menuItems);
  } catch (error) {
    console.error('Admin menu error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add menu item (for owner)
app.post('/api/admin/menu', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, price, category, description, emoji } = req.body;

    const menuItem = new MenuItem({
      name,
      price,
      category,
      description,
      emoji: emoji || '🍽️'
    });

    await menuItem.save();

    res.status(201).json({ 
      message: 'Menu item added successfully', 
      menuItem 
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item (for owner)
app.put('/api/admin/menu/:id', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { available, popular } = req.body;
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { available, popular },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ 
      message: 'Menu item updated successfully', 
      menuItem 
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notice (for owner)
app.post('/api/admin/notices', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, message, type, urgent } = req.body;

    const notice = new Notice({
      title,
      message,
      type,
      urgent: urgent || false
    });

    await notice.save();

    res.status(201).json({ 
      message: 'Notice created successfully', 
      notice 
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update time slot capacity (for owner)
app.put('/api/admin/time-slots/capacity', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { capacity } = req.body;

    await TimeSlot.updateMany({}, { total: capacity });
    
    res.json({ message: 'Capacity updated successfully' });
  } catch (error) {
    console.error('Update capacity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats (for owner)
app.get('/api/admin/dashboard', authMiddleware, async (req, res) => {
  try {
    if (req.userType !== 'owner') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's revenue
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);

    // Today's orders count
    const todayOrdersCount = todayOrders.length;

    // Today's bookings count
    const todayBookings = await Booking.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    const todayBookingsCount = todayBookings.length;

    // Active notices count
    const activeNoticesCount = await Notice.countDocuments();

    // Popular items
    const popularItems = await MenuItem.find({ popular: true });

    res.json({
      todayRevenue,
      todayOrders: todayOrdersCount,
      todayBookings: todayBookingsCount,
      activeNotices: activeNoticesCount,
      popularItems
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});