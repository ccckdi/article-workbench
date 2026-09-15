import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, user: string) {
  await page.goto("/console/login");
  await page.getByLabel("账号", { exact: true }).fill(user);
  await page.getByLabel("密码", { exact: true }).fill("Workbench2026!");
  await page.getByRole("button", { name: "登录 →", exact: true }).click();
  await expect(page).toHaveURL(/\/console\/articles$/);
}
test("作者保存、负责人发布、读者访问 Thymeleaf 页面", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "alice");
  await page.getByRole("link", { name: "新建文章" }).click();
  await page.getByLabel("文章标题", { exact: true }).fill("浏览器验证文章");
  await page
    .getByLabel("正文", { exact: true })
    .fill("第一段正文\n<script>window.injected=true</script>");
  await page
    .getByRole("textbox", { name: "文章摘要", exact: true })
    .fill("正文摘要");
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page).toHaveURL(/\/console\/articles\/[a-f0-9-]+$/);
  const publicPath = new URL(page.url()).pathname.replace("/console", "");
  await page.reload();
  await expect(page.getByLabel("文章标题", { exact: true })).toHaveValue(
    "浏览器验证文章",
  );
  await expect(
    page.getByRole("button", { name: "发布文章", exact: true }),
  ).toHaveCount(0);
  const visitor = await browser.newPage();
  await visitor.goto(publicPath);
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText(
    "文章不存在",
  );
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/console\/login$/);
  await login(page, "manager");
  await page.getByRole("link", { name: /浏览器验证文章/ }).click();
  await page.getByRole("button", { name: "发布文章", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("文章已发布");
  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(
    "浏览器验证文章",
  );
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
  await expect(visitor.getByRole("heading", { level: 1 })).toContainText(
    "文章不存在",
  );
  await visitor.close();
  expect(errors).toEqual([]);
});
test("未保存离开提醒、网络失败保留输入并重试", async ({ page }) => {
  await login(page, "alice");
  await page.getByRole("link", { name: /团队开放日/ }).click();
  await page.getByLabel("正文", { exact: true }).fill("保留的编辑内容");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("link", { name: "返回文章" }).click();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "保留的编辑内容",
  );
  await page.route("**/api/articles/article-open-day", (r) =>
    r.request().method() === "PUT" ? r.abort() : r.continue(),
  );
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "保留的编辑内容",
  );
  await page.unroute("**/api/articles/article-open-day");
  await page.getByRole("button", { name: "保存文章", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("已保存");
  await page.reload();
  await expect(page.getByLabel("正文", { exact: true })).toHaveValue(
    "保留的编辑内容",
  );
});
test("审核账号只读，移动端无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "reviewer");
  await expect(page.getByRole("link", { name: "新建文章" })).toHaveCount(0);
  await page.getByRole("link", { name: /团队开放日/ }).click();
  await expect(page.getByLabel("文章标题", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "保存文章", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/editor-mobile.png",
    fullPage: true,
  });
});
test("桌面工作台、公开列表和详情", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, "manager");
  await expect(page.locator(".article-row").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "分享所见",
  );
  await page.goto("/articles/article-welcome");
  await expect(page.locator(".reader-body")).toBeVisible();
  await page.screenshot({
    path: "test-results/reader-desktop.png",
    fullPage: true,
  });
});
