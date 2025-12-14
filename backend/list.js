const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Tables in database:");
        console.table(tables);
    }
    db.close();
});
