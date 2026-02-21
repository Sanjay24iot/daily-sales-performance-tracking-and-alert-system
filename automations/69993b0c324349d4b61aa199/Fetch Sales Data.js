// Fetch sales data from sheet, xlsx, or database, based on detected config.
const { GoogleSpreadsheet } = require('google-spreadsheet');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const { Client: PgClient } = require('pg');
const { MongoClient } = require('mongodb');
const fs = require('fs');

async function fetchSalesData() {
  // Google Sheets detection
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SHEET_ID) {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const sheets = Object.values(doc.sheetsById);
    const rows = (await sheets[0].getRows({ limit: 1000 })).map(r => r.toObject());
    return rows;
  }
  // XLSX file
  if (process.env.SALES_XLSX_FILE && fs.existsSync(process.env.SALES_XLSX_FILE)) {
    const workbook = XLSX.readFile(process.env.SALES_XLSX_FILE);
    const sname = workbook.SheetNames[0];
    const ws = workbook.Sheets[sname];
    return XLSX.utils.sheet_to_json(ws, { defval: null });
  }
  // Database
  const dbType = process.env.SALES_DB_TYPE;
  const uri = process.env.SALES_DB_URI;
  const dbName = process.env.SALES_DB_DATABASE;
  const dbTable = process.env.SALES_DB_TABLE;
  if (dbType && uri && dbTable) {
    if (dbType === 'mysql') {
      const conn = await mysql.createConnection(uri);
      const [rows] = await conn.execute(`SELECT * FROM \\`${dbTable}\\``);
      await conn.end();
      return rows;
    } else if (dbType === 'postgres') {
      const client = new PgClient({ connectionString: uri, database: dbName });
      await client.connect();
      const res = await client.query(`SELECT * FROM "${dbTable}"`);
      await client.end();
      return res.rows;
    } else if (dbType === 'mongodb') {
      const client = new MongoClient(uri);
      await client.connect();
      const coll = client.db(dbName).collection(dbTable);
      const docs = await coll.find({}).toArray();
      await client.close();
      return docs;
    } else {
      throw new Error('Unsupported database type');
    }
  }
  throw new Error('No valid sales data source configured. Please set up Google Sheets, XLSX file, or DB connection.');
}

(async () => {
  try {
    const data = await fetchSalesData();
    setContext('salesData', data);
    console.log(`Fetched ${Array.isArray(data) ? data.length : 0} sales records.`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
