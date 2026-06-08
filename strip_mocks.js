const fs = require('fs');

let code = fs.readFileSync('backend/src/index.ts', 'utf8');

// 1. Remove mock data for /api/stats
code = code.replace(/} catch \(dbErr\) {[\s\S]*?viewsAgg = { _sum: { views: 6050, likes: 400 } };\n    }/g, '} catch (dbErr: any) {\n      console.error(dbErr);\n      return res.status(500).json({ error: "Database offline", details: dbErr.message });\n    }');

// 2. Remove mock data for /api/strategist-insights
code = code.replace(/} catch \(dbErr\) {\n      console\.warn\("⚠️ Postgres Database not reachable during insights fetch\. Using simulated mock data\."\);\n    }/g, '} catch (dbErr: any) {\n      return res.status(500).json({ error: "Database offline" });\n    }');

// 3. Remove mock settings
code = code.replace(/} catch \(dbErr\) {[\s\S]*?console\.warn\("⚠️ Postgres Database not reachable during settings fetch\. Using in-memory mock settings\."\);\n    }/g, '} catch (dbErr: any) {\n      return res.status(500).json({ error: "Database offline" });\n    }');

// 4. Remove mock auth endpoints (auth is now handled by Supabase, but if we have mock auth endpoints like /api/auth/login, they should probably throw)
code = code.replace(/return res\.json\(\{ success: true, user: \{ id: "mock-id-".*?\);/g, 'return res.status(500).json({ error: "Auth is handled by Supabase" });');
code = code.replace(/return res\.json\(\{ success: true, user: \{ id: "mock-user-id".*?\);/g, 'return res.status(500).json({ error: "Auth is handled by Supabase" });');
code = code.replace(/return res\.json\(\{ success: true, message: `A password recovery code has been simulated.*?mockPassword123` \}\);/g, 'return res.status(500).json({ error: "Auth is handled by Supabase" });');

// 5. Remove mock sync endpoint
code = code.replace(/} catch \(error\) {[\s\S]*?console\.warn\("⚠️ Sync failed or Instagram API offline\. Generating mock synced metrics\."\);[\s\S]*?return res\.json\(\{ success: true, message: "Sync complete.*?" \}\);\n  }/g, '} catch (error: any) {\n    return res.status(500).json({ error: "Sync failed", details: error.message });\n  }');

fs.writeFileSync('backend/src/index.ts', code);
console.log("Mock data removed from index.ts");
