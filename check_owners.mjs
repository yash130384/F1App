
import { query } from "./src/lib/db.js";

async function check() {
  const leagues = await query("SELECT id, name, owner_id FROM leagues");
  console.log("Leagues:", JSON.stringify(leagues, null, 2));
  
  const users = await query("SELECT id, username FROM users");
  console.log("Users:", JSON.stringify(users, null, 2));
}

check();
