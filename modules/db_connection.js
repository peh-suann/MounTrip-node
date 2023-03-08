const mysql = require('mysql2')
const pool = mysql.createPool({
  host: 'localhost',
  // host: '192.168.21.84',

  user: 'root',
  // user: 'mountain',

  password: '',
  // password: 'mountaindude55',

  // database: 'mountrip_dev',
  database: 'mountain',

  waitForConnections: true,
  connectionLimit: 5, //最多五人同時連線
  queueLimit: 0,
})

module.exports = pool.promise()
