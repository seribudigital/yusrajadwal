import dotenv from 'dotenv';
dotenv.config();

if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.trim();
  
  // Strip surrounding double quotes
  if (url.startsWith('"') && url.endsWith('"')) {
    url = url.slice(1, -1);
  }
  // Strip surrounding single quotes
  if (url.startsWith("'") && url.endsWith("'")) {
    url = url.slice(1, -1);
  }
  
  process.env.DATABASE_URL = url.trim();
}
