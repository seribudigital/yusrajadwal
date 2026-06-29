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
  
  // Auto-route Supabase direct connections to their PgBouncer pooler on port 6543
  if (url.includes('.supabase.co:5432')) {
    url = url.replace('.supabase.co:5432', '.supabase.co:6543');
    if (!url.includes('pgbouncer=true')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}pgbouncer=true`;
    }
  }

  // Auto-append pgbouncer=true to disable prepared statements if using Supabase Pooler
  if (url.includes('pooler.supabase.com') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}pgbouncer=true`;
  }

  // Optimize connection_limit to prevent pool timeouts under concurrent page loads
  if (url.includes('connection_limit=')) {
    const match = url.match(/connection_limit=(\d+)/);
    if (match && parseInt(match[1]) < 15) {
      url = url.replace(/connection_limit=\d+/, 'connection_limit=15');
    }
  } else {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}connection_limit=15`;
  }
  
  process.env.DATABASE_URL = url;
}
