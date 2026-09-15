import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database.js";
import { seedDatabase } from "../server/seed.js";

const password = "Workbench2026!";
const content = {
  title: "新的文章",
  excerpt: "内容摘要",
  body: "第一段正文\n第二段正文",
};
async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "article-workbench-"));
  const databasePath = join(directory, "test.sqlite");
  const db = openDatabase(databasePath);
  seedDatabase(db);
  db.close();
  let app = await createApp({
    databasePath,
    staticDir: join(directory, "no-static"),
  });
  return {
    get app() {
      return app;
    },
    databasePath,
    async restart() {
      await app.close();
      app = await createApp({
        databasePath,
        staticDir: join(directory, "no-static"),
      });
    },
    async login(username: string) {
      const response = await app.inject({
        method: "POST",
        url: "/api/session",
        payload: { username, password },
      });
      assert.equal(response.statusCode, 200, response.body);
      return response.cookies[0].name + "=" + response.cookies[0].value;
    },
    async close() {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("会话持久化、Cookie 属性、注销与错误口令", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const wrong = await f.app.inject({
    method: "POST",
    url: "/api/session",
    payload: { username: "alice", password: "wrong" },
  });
  assert.equal(wrong.statusCode, 401);
  assert.equal(wrong.cookies.length, 0);
  const response = await f.app.inject({
    method: "POST",
    url: "/api/session",
    payload: { username: "alice", password },
  });
  assert.equal(response.statusCode, 200);
  assert.match(String(response.headers["set-cookie"]), /HttpOnly/);
  assert.match(String(response.headers["set-cookie"]), /SameSite=Strict/);
  assert.equal(response.json().user.password_hash, undefined);
  const cookie = response.cookies[0].name + "=" + response.cookies[0].value;
  await f.restart();
  assert.equal(
    (await f.app.inject({ url: "/api/session", headers: { cookie } })).json()
      .user.username,
    "alice",
  );
  assert.equal(
    (
      await f.app.inject({
        method: "DELETE",
        url: "/api/session",
        headers: { cookie },
      })
    ).statusCode,
    204,
  );
  assert.equal(
    (await f.app.inject({ url: "/api/session", headers: { cookie } })).json()
      .user,
    null,
  );
});

test("未登录不可写入，公开接口不可读取草稿，作者之间隔离", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  assert.equal((await f.app.inject({ url: "/api/articles" })).statusCode, 401);
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: "/api/articles",
        payload: content,
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (await f.app.inject({ url: "/api/public/articles/article-open-day" }))
      .statusCode,
    404,
  );
  const publicList = (
    await f.app.inject({ url: "/api/public/articles" })
  ).json();
  assert.equal(publicList.total, 1);
  assert.equal(publicList.items[0].id, "article-welcome");
  const cookie = await f.login("alice");
  const own = (
    await f.app.inject({ url: "/api/articles", headers: { cookie } })
  ).json();
  assert.equal(own.total, 2);
  assert.ok(
    own.items.every((a: { authorId: string }) => a.authorId === "user-alice"),
  );
  assert.equal(
    (
      await f.app.inject({
        url: "/api/articles/article-field-notes",
        headers: { cookie },
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await f.app.inject({
        method: "PUT",
        url: "/api/articles/article-field-notes",
        headers: { cookie },
        payload: content,
      })
    ).statusCode,
    404,
  );
});

test("保存、编辑、发布和取消发布使用真实持久化数据", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const alice = await f.login("alice");
  const editor = await f.login("editor");
  const publisher = await f.login("publisher");
  const created = await f.app.inject({
    method: "POST",
    url: "/api/articles",
    headers: { cookie: alice },
    payload: content,
  });
  assert.equal(created.statusCode, 201);
  const id = created.json().article.id;
  assert.equal(created.json().article.status, "draft");
  assert.equal(created.json().article.authorId, "user-alice");
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: `/api/articles/${id}/publish`,
        headers: { cookie: alice },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: `/api/articles/${id}/publish`,
        headers: { cookie: editor },
      })
    ).statusCode,
    403,
  );
  const updated = {
    ...content,
    title: "编辑后的标题",
    body: "<script>alert(1)</script>\n正文按文本保存",
  };
  assert.equal(
    (
      await f.app.inject({
        method: "PUT",
        url: `/api/articles/${id}`,
        headers: { cookie: editor },
        payload: updated,
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await f.app.inject({
        method: "PUT",
        url: `/api/articles/${id}`,
        headers: { cookie: publisher },
        payload: content,
      })
    ).statusCode,
    403,
  );
  const first = await f.app.inject({
    method: "POST",
    url: `/api/articles/${id}/publish`,
    headers: { cookie: publisher },
  });
  const repeat = await f.app.inject({
    method: "POST",
    url: `/api/articles/${id}/publish`,
    headers: { cookie: publisher },
  });
  assert.equal(first.statusCode, 200);
  assert.deepEqual(repeat.json(), first.json());
  await f.restart();
  const publicArticle = (
    await f.app.inject({ url: `/api/public/articles/${id}` })
  ).json().article;
  assert.equal(publicArticle.title, updated.title);
  assert.equal(publicArticle.body, updated.body);
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: `/api/articles/${id}/unpublish`,
        headers: { cookie: publisher },
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (await f.app.inject({ url: `/api/public/articles/${id}` })).statusCode,
    404,
  );
  assert.equal(
    (
      await f.app.inject({
        url: `/api/articles/${id}`,
        headers: { cookie: alice },
      })
    ).json().article.title,
    updated.title,
  );
});

test("审核账号只读，服务端拒绝身份和状态注入、无效输入、跨站写入", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const reviewer = await f.login("reviewer");
  const alice = await f.login("alice");
  assert.equal(
    (
      await f.app.inject({
        url: "/api/articles",
        headers: { cookie: reviewer },
      })
    ).json().total,
    3,
  );
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: "/api/articles",
        headers: { cookie: reviewer },
        payload: content,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.app.inject({
        method: "PUT",
        url: "/api/articles/article-open-day",
        headers: { cookie: reviewer },
        payload: content,
      })
    ).statusCode,
    403,
  );
  for (const payload of [
    { ...content, authorId: "user-bob" },
    { ...content, status: "published" },
    { ...content, title: "   " },
    { ...content, body: "x".repeat(50001) },
  ]) {
    assert.equal(
      (
        await f.app.inject({
          method: "POST",
          url: "/api/articles",
          headers: { cookie: alice },
          payload,
        })
      ).statusCode,
      400,
    );
  }
  assert.equal(
    (
      await f.app.inject({
        method: "POST",
        url: "/api/articles",
        headers: { cookie: alice, origin: "https://untrusted.example" },
        payload: content,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await f.app.inject({
        url: "/api/articles?page=-1",
        headers: { cookie: alice },
      })
    ).statusCode,
    400,
  );
});

test("分页和搜索保持权限范围，SQL 内容不被解释为语句", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const cookie = await f.login("alice");
  for (let i = 0; i < 22; i++)
    await f.app.inject({
      method: "POST",
      url: "/api/articles",
      headers: { cookie },
      payload: { ...content, title: `分页文章 ${i}` },
    });
  const first = (
    await f.app.inject({
      url: "/api/articles?q=分页文章&page=1",
      headers: { cookie },
    })
  ).json();
  const second = (
    await f.app.inject({
      url: "/api/articles?q=分页文章&page=2",
      headers: { cookie },
    })
  ).json();
  assert.equal(first.total, 22);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 2);
  assert.equal(
    new Set([...first.items, ...second.items].map((a) => a.id)).size,
    22,
  );
  assert.equal(
    (
      await f.app.inject({
        url: "/api/articles?q=" + encodeURIComponent("' OR 1=1 --"),
        headers: { cookie },
      })
    ).json().total,
    0,
  );
});

test("重复初始化保留现有文章和账号，会话过期后失效", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const cookie = await f.login("alice");
  await f.app.inject({
    method: "PUT",
    url: "/api/articles/article-open-day",
    headers: { cookie },
    payload: content,
  });
  const db = openDatabase(f.databasePath);
  try {
    seedDatabase(db);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get()?.n, 6);
    assert.equal(
      db
        .prepare("SELECT title FROM articles WHERE id=?")
        .get("article-open-day")?.title,
      content.title,
    );
    db.prepare("UPDATE sessions SET expires_at=0").run();
  } finally {
    db.close();
  }
  assert.equal(
    (await f.app.inject({ url: "/api/articles", headers: { cookie } }))
      .statusCode,
    401,
  );
});
