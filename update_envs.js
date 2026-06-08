const fs = require('fs');

const dbUrl = 'postgresql://postgres.kepnvroifvwxhjlkiwvt:SRDoHMWHuYOWUJOI@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';
const supaUrl = 'https://kepnvroifvwxhjlkiwvt.supabase.co';
const supaKey = 'sb_publishable_bDilTUerwgRazdgYJVJslw_TeUvKNuf';

let backendEnv = fs.readFileSync('backend/.env', 'utf8');
backendEnv = backendEnv.replace(/DATABASE_URL=".*?"/, `DATABASE_URL="${dbUrl}"`);
fs.writeFileSync('backend/.env', backendEnv);

let frontendEnv = fs.readFileSync('frontend/.env.local', 'utf8');
frontendEnv = frontendEnv.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/, `NEXT_PUBLIC_SUPABASE_URL=${supaUrl}`);
frontendEnv = frontendEnv.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supaKey}`);
fs.writeFileSync('frontend/.env.local', frontendEnv);

console.log("Updated environments!");
