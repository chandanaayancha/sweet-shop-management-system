const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) return console.error('❌ Error opening database:', err.message);
    console.log('✅ Connected to database.');
});

// ====== CONFIG ======
const newUser = { email: 'user3@example.com', password: '1234' };
const sweetToBuy = 'Chocolate Bar'; // Name of sweet
const purchaseQuantity = 2; // How many sweets to buy

// ====== 1. Register User ======
function registerUser(user, callback) {
    db.run(
        `INSERT INTO users (email, password, isAdmin) VALUES (?, ?, 0)`,
        [user.email, user.password],
        function(err) {
            if (err) {
                console.error('❌ Registration failed:', err.message);
                // If user already exists, fetch their ID
                db.get(`SELECT id FROM users WHERE email = ?`, [user.email], (err2, row) => {
                    if (err2) return console.error(err2.message);
                    callback(row.id);
                });
            } else {
                console.log(`✅ User registered with ID: ${this.lastID}`);
                callback(this.lastID);
            }
        }
    );
}

// ====== 2. Purchase Sweet ======
function purchaseSweet(userId, sweetName, quantity, callback) {
    // Get sweet details first
    db.get(`SELECT * FROM sweets WHERE name = ?`, [sweetName], (err, sweet) => {
        if (err || !sweet) return console.error('❌ Sweet not found or error');
        if (sweet.quantity < quantity) return console.error('❌ Not enough stock');

        // Reduce sweet quantity
        db.run(
            `UPDATE sweets SET quantity = quantity - ? WHERE id = ?`,
            [quantity, sweet.id],
            function(err) {
                if (err) return console.error(err.message);

                // Insert into purchases table
                db.run(
                    `INSERT INTO purchases (user_id, sweet_name, quantity, price, date) VALUES (?, ?, ?, ?, ?)`,
                    [userId, sweet.name, quantity, sweet.price * quantity, new Date().toISOString().split('T')[0]],
                    function(err) {
                        if (err) return console.error(err.message);
                        console.log(`✅ Purchased ${quantity} ${sweet.name}(s)`);
                        callback();
                    }
                );
            }
        );
    });
}

// ====== 3. Show all users and their purchases + total price ======
function showUsersAndPurchases() {
    const query = `
        SELECT 
            users.id AS user_id,
            users.email,
            purchases.id AS purchase_id,
            purchases.sweet_name,
            purchases.quantity,
            purchases.price,
            purchases.date
        FROM users
        LEFT JOIN purchases ON users.id = purchases.user_id
        ORDER BY users.id
    `;
    db.all(query, [], (err, rows) => {
        if (err) return console.error(err.message);

        console.log('\n📋 All users and their purchases:');
        const summary = {};
        rows.forEach(row => {
            if (!summary[row.user_id]) summary[row.user_id] = { email: row.email, total: 0, purchases: [] };
            if (row.purchase_id) {
                summary[row.user_id].purchases.push({
                    sweet_name: row.sweet_name,
                    quantity: row.quantity,
                    price: row.price,
                    date: row.date
                });
                summary[row.user_id].total += row.price;
            }
        });

        for (const uid in summary) {
            console.log(`\nUser: ${summary[uid].email}`);
            console.table(summary[uid].purchases);
            console.log('💰 Total spent:', summary[uid].total);
        }

        db.close();
    });
}

// ====== RUN EVERYTHING ======
registerUser(newUser, (userId) => {
    purchaseSweet(userId, sweetToBuy, purchaseQuantity, () => {
        showUsersAndPurchases();
    });
});
