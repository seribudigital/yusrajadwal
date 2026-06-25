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
  
  url = url.trim();
  
  // Auto-append pgbouncer=true to disable prepared statements if using Supabase Pooler
  if (url.includes('pooler.supabase.com') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}pgbouncer=true`;
  }
  
  process.env.DATABASE_URL = url;
}
