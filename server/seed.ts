import type { Database } from "./database.js";
import { passwordRecord } from "./auth.js";

export const demoPassword = "Workbench2026!";
export const demoUsers = [
  { id: "user-alice", username: "alice", name: "林晓", roles: ["author"] },
  { id: "user-bob", username: "bob", name: "陈远", roles: ["author"] },
  { id: "user-editor", username: "editor", name: "周宁", roles: ["editor"] },
  {
    id: "user-reviewer",
    username: "reviewer",
    name: "苏晴",
    roles: ["reviewer"],
  },
  {
    id: "user-publisher",
    username: "publisher",
    name: "许言",
    roles: ["publisher"],
  },
  {
    id: "user-manager",
    username: "manager",
    name: "内容负责人",
    roles: ["editor", "reviewer", "publisher"],
  },
];
export function seedDatabase(db: Database) {
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const user of demoUsers) {
      if (
        db.prepare("SELECT id FROM users WHERE username = ?").get(user.username)
      )
        continue;
      const { salt, hash } = passwordRecord(demoPassword);
      db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)").run(
        user.id,
        user.username,
        user.name,
        JSON.stringify(user.roles),
        salt,
        hash,
      );
    }
    const now = new Date().toISOString();
    const insert = db.prepare(`INSERT OR IGNORE INTO articles
      (id,title,excerpt,body,author_id,status,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    insert.run(
      "article-welcome",
      "把想法写下来，让协作发生",
      "一处安静的写作空间，让每一份好内容被看见。",
      "欢迎来到文章工作台。\n\n这里汇集团队的观察、经验与新想法。你可以整理草稿、编辑文章，也可以在公开站点阅读已经发布的内容。\n\n写作从一个清晰的问题开始。把背景说清楚，用具体事实支撑观点，再邀请同事一起完善。",
      "user-alice",
      "published",
      now,
      now,
      now,
    );
    insert.run(
      "article-open-day",
      "团队开放日：把计划变成相遇",
      "关于下一次团队开放日的筹备想法。",
      "我们计划在下个月组织一次开放日。\n\n上午安排项目分享，下午留给自由交流。场地和具体时间还需要进一步确认。",
      "user-alice",
      "draft",
      now,
      now,
      null,
    );
    insert.run(
      "article-field-notes",
      "一次用户访谈的现场笔记",
      "从真实场景中发现值得解决的问题。",
      "先听完一个完整的故事，再开始提问。\n\n这次访谈让我重新思考了用户保存草稿时的期待。",
      "user-bob",
      "draft",
      now,
      now,
      null,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
