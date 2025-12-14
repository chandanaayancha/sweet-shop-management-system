// see.js - Updated for YOUR database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');  // CHANGED to YOUR database

console.log('=== CHECKING YOUR DATABASE ===');

// Show all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log('\n📊 TABLES IN YOUR DATABASE:');
    tables.forEach(table => {
        console.log(`   - ${table.name}`);
    });
    
    // Show data from each table
    tables.forEach(table => {
        console.log(`\n📈 DATA IN "${table.name}" TABLE:`);
        db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
            if (err) {
                console.log(`   (Empty or error: ${err.message})`);
            } else {
                console.table(rows);
            }
            
            // Close after last table
            if (table === tables[tables.length - 1]) {
                db.close();
                console.log('\n✅ Database check complete!');
            }
        });
    });
});