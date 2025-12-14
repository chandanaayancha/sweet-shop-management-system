// add-user.js - Add user to YOUR database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Add a new user
const newUser = {
    email: 'test@example.com',
    password: 'test123',
    isAdmin: 0
};

db.run(
    'INSERT INTO users (email, password, isAdmin) VALUES (?, ?, ?)',
    [newUser.email, newUser.password, newUser.isAdmin],
    function(err) {
        if (err) {
            console.error('Error:', err.message);
        } else {
            console.log(`✅ User added with ID: ${this.lastID}`);
            console.log(`📧 Email: ${newUser.email}`);
            console.log(`🔑 Password: ${newUser.password}`);
            console.log(`👑 Admin: ${newUser.isAdmin === 1 ? 'Yes' : 'No'}`);
        }
        db.close();
    }
);