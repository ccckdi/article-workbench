import { openDatabase } from "./database.js";
import { seedDatabase, demoPassword } from "./seed.js";
const db = openDatabase(process.env.DATABASE_PATH || "./data/workbench.sqlite");
try {
  seedDatabase(db);
  console.log(`演示数据已准备。账号见 README，演示密码：${demoPassword}`);
} finally {
  db.close();
}
