import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(username);
  await page.getByLabel("密码", { exact: true }).fill("Workbench2026!");
  await page.getByRole("button", { name: "登录 →", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
}

test("作者保存草稿，负责人发布，访客阅读和取消发布", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "alice");
  await page.getByRole("link", { name: "新建文章" }).click();
  const title = "浏览器验证文章";
  await page.getByLabel("文章标题", { exact: true }).fill(title);
  await page
    .getByLabel("正文", { exact: true })
    .fill("第一段内容\n<script>window.injected=true</script>");
  await page
    .getByRole("textbox", { name: "文章摘要", exact: true })
    .fill("浏览器验证摘要");
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/articles\/.+/);
  const path = new URL(page.url()).pathname;
  await page.reload();
  await expect(page.getByLabel("文章标题", { exact: true })).toHaveValue(title);
  await expect(
    page.getByRole("button", { name: "发布文章", exact: true }),
  ).toHaveCount(0);
  const visitor = await browser.newPage();
  await visitor.goto(path.replace("/workspace", ""));
  await expect(visitor.getByRole("alert")).toContainText("文章不存在");
  await page.getByRole("button", { name: "退出登录" }).click();
  await login(page, "manager");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "发布文章", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("文章已发布");
  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(visitor.locator(".reader-body")).toContainText(
    "<script>window.injected=true</script>",
  );
  expect(
    await visitor.evaluate(
      () => (window as unknown as { injected?: boolean }).injected,
    ),
  ).toBeUndefined();
  await page.getByRole("button", { name: "取消发布", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("文章已取消发布");
  await visitor.reload();
  await expect(visitor.getByRole("alert")).toContainText("文章不存在");
  await visitor.close();
  expect(errors).toEqual([]);
});

test("离开未保存文章时可以保留本地输入", async ({ page }) => {
  await login(page, "alice");
  await page.getByRole("link", { name: /团队开放日/ }).click();
  await page.getByLabel("正文", { exact: true }).fill("尚未保存的文字");
  await page.getByRole("link", { name: "返回文章" }).click();
  await page.getByRole("button", { name: "继续编辑", exact: true }).click();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "尚未保存的文字",
  );
  await page.getByRole("link", { name: "返回文章" }).click();
  await page
    .getByRole("button", { name: "放弃修改并离开", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace$/);
});

test("移动端可登录和编辑，页面没有横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "分享所见",
  );
  await page.screenshot({
    path: "test-results/public-mobile.png",
    fullPage: true,
  });
  await login(page, "manager");
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: /团队开放日/ }).click();
  await expect(page.getByLabel("文章标题", { exact: true })).toBeEditable();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/editor-mobile.png",
    fullPage: true,
  });
});

test("保存失败保留输入，恢复网络后可以重试", async ({ page }) => {
  await login(page, "alice");
  await page.getByRole("link", { name: /团队开放日/ }).click();
  const pattern = "**/api/articles/article-open-day";
  await page.route(pattern, (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  await page
    .getByLabel("正文", { exact: true })
    .fill("网络恢复后仍需保存的正文");
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "网络恢复后仍需保存的正文",
  );
  await page.unroute(pattern);
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已保存");
  await page.reload();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "网络恢复后仍需保存的正文",
  );
});

test("桌面工作台与阅读页面", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "manager");
  await expect(page.locator(".article-row").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.goto("/articles/article-welcome");
  await expect(page.locator(".reader-body")).toBeVisible();
  await page.screenshot({
    path: "test-results/reader-desktop.png",
    fullPage: true,
  });
});
