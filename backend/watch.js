// watch-db.js - Auto-refresh database viewer
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

console.log('🔍 Watching database for changes...');
console.log('Press Ctrl+C to stop\n');

// Show initial data
showData();

// Watch file for changes
fs.watchFile('./database.db', () => {
    console.log('\n🔄 Database changed!');
    showData();
});

function showData() {
    const db = new sqlite3.Database('./database.db');
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) console.error('Error:', err.message);
        else {
            console.log('📋 Current users:');
            console.table(rows);
        }
        db.close();
    });
}