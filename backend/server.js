const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// ================= FIX CORS =================
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ================= DATABASE PATH =================
const dbPath = path.resolve(__dirname, 'database.db');
console.log('📁 Database path:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.log('💡 Creating new database...');
  } else {
    console.log('✅ Connected to SQLite database');
    
    // Initialize database after connection
    initializeDatabase();
  }
});

// ================= INITIALIZE DATABASE =================
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isAdmin INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) console.error('Users table error:', err.message);
      else console.log('✅ Users table ready');
    });

    // Sweets table
    db.run(`
      CREATE TABLE IF NOT EXISTS sweets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT,
        price REAL,
        quantity INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) console.error('Sweets table error:', err.message);
      else console.log('✅ Sweets table ready');
    });

    // Purchases table
    db.run(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        sweet_name TEXT,
        quantity INTEGER,
        price REAL,
        date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Purchases table error:', err.message);
      else console.log('✅ Purchases table ready');
    });

    // ================= ADD DEFAULT DATA =================
    // Check if users exist
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) console.error('Error checking users:', err.message);
      else if (row.count === 0) {
        db.run(`
          INSERT INTO users (email, password, isAdmin) VALUES
          ('admin@shop.com', 'admin123', 1),
          ('user@shop.com', 'user123', 0)
        `, (err) => {
          if (err) console.error('Default users error:', err.message);
          else console.log('✅ Default users added');
        });
      } else {
        console.log(`✅ Users already exist (${row.count} users)`);
      }
    });

    // Check if sweets exist - FIXED VERSION
    db.get("SELECT COUNT(*) as count FROM sweets", (err, row) => {
      if (err) {
        console.error('Error checking sweets:', err.message);
        return;
      }
      
      if (row.count === 0) {
        console.log('🆕 No sweets found, adding default sweets...');
        
        const defaultSweets = [
          ['Chocolate Bar', 'Chocolate', 4.99, 50],
          ['Gummy Bears', 'Candy', 3.99, 30],
          ['Lollipop', 'Candy', 1.99, 100],
          ['Cupcake', 'Bakery', 2.99, 20],
          ['Brownie', 'Bakery', 3.49, 25],
          ['Donut', 'Bakery', 2.49, 40],
          ['Ice Cream', 'Frozen', 5.99, 35],
          ['Milk Chocolate', 'Chocolate', 3.99, 60],
          ['Dark Chocolate', 'Chocolate', 4.49, 45],
          ['Jelly Beans', 'Candy', 2.99, 80],
          ['Caramel Candy', 'Candy', 3.49, 55],
          ['Pastry', 'Bakery', 4.99, 15],
          ['Cookies', 'Bakery', 3.99, 50],
          ['Toffee', 'Candy', 1.49, 120],
          ['White Chocolate', 'Chocolate', 4.29, 40],
          ['Chocolate Truffles', 'Chocolate', 6.99, 30],
          ['Sour Worms', 'Candy', 2.49, 75],
          ['Macarons', 'Bakery', 5.49, 25],
          ['Fudge', 'Chocolate', 4.99, 40],
          ['Peppermint Candy', 'Candy', 1.99, 150]
        ];

        // Use a transaction for better performance
        db.run("BEGIN TRANSACTION");
        
        const stmt = db.prepare("INSERT OR IGNORE INTO sweets (name, category, price, quantity) VALUES (?, ?, ?, ?)");
        
        defaultSweets.forEach(sweet => {
          stmt.run(sweet, (err) => {
            if (err) console.error('Error inserting sweet:', err.message);
          });
        });
        
        stmt.finalize((err) => {
          if (err) {
            console.error('Error finalizing statement:', err.message);
            db.run("ROLLBACK");
          } else {
            db.run("COMMIT", (err) => {
              if (err) console.error('Error committing transaction:', err.message);
              else console.log(`✅ ${defaultSweets.length} default sweets added`);
            });
          }
        });
      } else {
        console.log(`✅ Sweets already exist (${row.count} sweets)`);
      }
    });
  });
}

// ================= REGISTRATION =================
app.post('/api/auth/register', (req, res) => {
  console.log('📝 Registration attempt:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password required' 
    });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }
    
    if (row) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }

    db.run(
      'INSERT INTO users (email, password, isAdmin) VALUES (?, ?, 0)',
      [email, password],
      function(err) {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: 'Registration failed' 
          });
        }
        
        console.log('✅ User registered with ID:', this.lastID);
        res.json({ 
          success: true, 
          message: 'Registration successful!',
          user: { 
            id: this.lastID, 
            email: email, 
            isAdmin: false 
          }
        });
      }
    );
  });
});

// ================= LOGIN =================
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and password required' 
    });
  }

  db.get(
    'SELECT id, email, password, isAdmin FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: 'Database error' 
        });
      }
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid email or password' 
        });
      }
      
      console.log('✅ Login successful for:', user.email);
      res.json({
        success: true,
        message: 'Login successful!',
        user: { 
          id: user.id,
          email: user.email, 
          isAdmin: user.isAdmin === 1 
        }
      });
    }
  );
});

// ================= SWEETS ENDPOINTS =================
// Get all sweets - FIXED: Return object with sweets property
app.get('/api/sweets', (req, res) => {
  console.log('📦 Fetching all sweets...');
  db.all('SELECT * FROM sweets ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Get sweets error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`📊 Found ${rows.length} sweets`);
    res.json({ sweets: rows });
  });
});

// Add sweet
app.post('/api/sweets', (req, res) => {
  const { name, category, price, quantity } = req.body;
  
  console.log('➕ Adding new sweet:', { name, category, price, quantity });
  
  if (!name || !price) {
    return res.status(400).json({ 
      success: false,
      error: 'Name and price required' 
    });
  }

  db.run(
    'INSERT INTO sweets (name, category, price, quantity) VALUES (?, ?, ?, ?)',
    [name, category || 'General', price, quantity || 0],
    function(err) {
      if (err) {
        console.error('Add sweet error:', err.message);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to add sweet. Sweet name might already exist.' 
        });
      }
      
      console.log('✅ Sweet added with ID:', this.lastID);
      
      // Return the newly created sweet
      db.get('SELECT * FROM sweets WHERE id = ?', [this.lastID], (err, newSweet) => {
        if (err) {
          console.error('Fetch new sweet error:', err.message);
          return res.status(500).json({ 
            success: false,
            error: 'Sweet added but failed to fetch details' 
          });
        }
        
        res.json({ 
          success: true, 
          message: 'Sweet added successfully',
          sweet: newSweet 
        });
      });
    }
  );
});

// Delete sweet
app.delete('/api/sweets/:id', (req, res) => {
  console.log('🗑️ Deleting sweet ID:', req.params.id);
  
  db.run('DELETE FROM sweets WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('Delete sweet error:', err.message);
      return res.status(500).json({ error: 'Failed to delete' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    console.log('✅ Sweet deleted');
    res.json({ success: true, message: 'Sweet deleted' });
  });
});

// ✅ Purchase sweet with total price
app.post('/api/sweets/:id/purchase', (req, res) => {
  const { user_id, quantity = 1 } = req.body;
  
  console.log('🛒 Purchase attempt:', { user_id, sweet_id: req.params.id, quantity });
  
  if (!user_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID required. Please login first.' 
    });
  }

  db.get('SELECT * FROM sweets WHERE id = ?', [req.params.id], (err, sweet) => {
    if (err || !sweet) {
      console.error('Sweet not found:', err?.message);
      return res.status(404).json({ 
        success: false, 
        error: 'Sweet not found' 
      });
    }
    
    if (sweet.quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: `Only ${sweet.quantity} items available in stock` 
      });
    }

    // Calculate total price
    const totalPrice = sweet.price * quantity;
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Start transaction
    db.serialize(() => {
      // Update sweet quantity
      db.run('UPDATE sweets SET quantity = quantity - ? WHERE id = ?', 
        [quantity, req.params.id], 
        (err) => {
          if (err) {
            console.error('Update quantity error:', err.message);
            return res.status(500).json({ 
              success: false, 
              error: 'Purchase failed' 
            });
          }
          
          // Add purchase record
          db.run(
            'INSERT INTO purchases (user_id, sweet_name, quantity, price, date) VALUES (?, ?, ?, ?, ?)',
            [user_id, sweet.name, quantity, sweet.price, date],
            function(err) {
              if (err) {
                console.error('Purchase insert error:', err.message);
                return res.status(500).json({ 
                  success: false, 
                  error: 'Purchase failed' 
                });
              }
              
              console.log('✅ Purchase successful, ID:', this.lastID);
              res.json({ 
                success: true, 
                message: 'Purchase successful!',
                purchaseDetails: {
                  purchaseId: this.lastID,
                  sweetName: sweet.name,
                  quantity: quantity,
                  unitPrice: sweet.price,
                  totalPrice: totalPrice,
                  date: date
                }
              });
            }
          );
        }
      );
    });
  });
});

// Restock sweet
app.post('/api/sweets/:id/restock', (req, res) => {
  console.log('📦 Restocking sweet ID:', req.params.id);
  
  db.run(
    'UPDATE sweets SET quantity = quantity + 10 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) {
        console.error('Restock error:', err.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Restock failed' 
        });
      }
      console.log('✅ Restocked 10 items for sweet ID:', req.params.id);
      res.json({ 
        success: true, 
        message: 'Restocked 10 items' 
      });
    }
  );
});

// Search sweets - FIXED: Return object with sweets property
app.get('/api/sweets/search', (req, res) => {
  const name = `%${req.query.name || ''}%`;
  const category = `%${req.query.category || ''}%`;
  
  console.log('🔍 Search request:', { name, category });
  
  let query = 'SELECT * FROM sweets WHERE name LIKE ? AND category LIKE ?';
  let params = [name, category];
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Search error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`🔍 Found ${rows.length} sweets`);
    res.json({ sweets: rows });
  });
});

// ================= GET PURCHASE HISTORY =================
app.get('/api/purchases/user/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  console.log('📋 Fetching purchase history for user:', user_id);
  
  db.all(
    `SELECT * FROM purchases 
     WHERE user_id = ? 
     ORDER BY date DESC, id DESC
     LIMIT 50`,
    [user_id],
    (err, purchases) => {
      if (err) {
        console.error('Get purchases error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Calculate totals
      let totalItems = 0;
      let totalAmount = 0;
      
      purchases.forEach(purchase => {
        totalItems += purchase.quantity;
        totalAmount += (purchase.price * purchase.quantity);
      });
      
      console.log(`📊 Found ${purchases.length} purchases for user ${user_id}`);
      
      res.json({
        purchases: purchases,
        summary: {
          totalItems: totalItems,
          totalAmount: totalAmount.toFixed(2),
          purchaseCount: purchases.length
        }
      });
    }
  );
});

// ================= GET CATEGORIES =================
app.get('/api/categories', (req, res) => {
  console.log('🏷️ Fetching categories...');
  
  db.all(
    'SELECT DISTINCT category FROM sweets WHERE category IS NOT NULL ORDER BY category',
    [],
    (err, rows) => {
      if (err) {
        console.error('Get categories error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log(`🏷️ Found ${rows.length} categories`);
      res.json(rows.map(row => row.category));
    }
  );
});

// ================= GET SWEET BY ID =================
app.get('/api/sweets/:id', (req, res) => {
  console.log('📄 Fetching sweet ID:', req.params.id);
  
  db.get('SELECT * FROM sweets WHERE id = ?', [req.params.id], (err, sweet) => {
    if (err) {
      console.error('Get sweet error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!sweet) {
      return res.status(404).json({ error: 'Sweet not found' });
    }
    res.json(sweet);
  });
});

// ================= TEST ENDPOINTS =================
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is working!',
    time: new Date().toISOString(),
    database: dbPath
  });
});

// ================= GET DATABASE STATS =================
app.get('/api/stats', (req, res) => {
  const stats = {};
  
  db.get("SELECT COUNT(*) as count FROM sweets", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalSweets = row.count;
    
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalUsers = row.count;
      
      db.get("SELECT COUNT(*) as count FROM purchases", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalPurchases = row.count;
        
        db.get("SELECT SUM(price * quantity) as totalValue FROM sweets", (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          stats.totalValue = row.totalValue || 0;
          
          res.json(stats);
        });
      });
    });
  });
});

// ================= CLEAR AND RESET DATABASE (for testing) =================
app.post('/api/reset-database', (req, res) => {
  if (req.query.secret !== 'reset123') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  console.log('🔄 Resetting database...');
  
  db.serialize(() => {
    db.run('DELETE FROM purchases', (err) => {
      if (err) console.error('Error clearing purchases:', err.message);
    });
    
    db.run('DELETE FROM sweets', (err) => {
      if (err) console.error('Error clearing sweets:', err.message);
    });
    
    db.run('DELETE FROM users WHERE email NOT IN ("admin@shop.com", "user@shop.com")', (err) => {
      if (err) console.error('Error clearing users:', err.message);
    });
    
    // Reinitialize default sweets
    initializeDatabase();
    
    res.json({ success: true, message: 'Database reset successfully' });
  });
});

// ================= START SERVER =================
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://127.0.0.1:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   GET  /api/test           - Test backend`);
  console.log(`   GET  /api/stats          - Get database stats`);
  console.log(`   POST /api/auth/register  - Register user`);
  console.log(`   POST /api/auth/login     - Login user`);
  console.log(`   GET  /api/sweets         - Get all sweets`);
  console.log(`   POST /api/sweets         - Add new sweet`);
  console.log(`   POST /api/sweets/:id/purchase - Purchase sweet`);
  console.log(`   GET  /api/purchases/user/:user_id - Get purchase history`);
  console.log(`   GET  /api/categories     - Get all categories`);
  console.log(`   POST /api/reset-database?secret=reset123 - Reset database (careful!)`);
  console.log('\n💡 TIP: If sweets don\'t load, try http://localhost:5000/api/reset-database?secret=reset123');
});

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});