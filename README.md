# 文章工作台

AI 全栈开发考核起始工程 · v0.2.0

## 任务

一个内容团队共同维护文章。作者需要保存草稿、提交审核并根据意见修改，内容负责人负责审核和发布。请在本工程上完成文章协作审核与可信发布，交付可运行的前后端功能。

开发工具、AI 工具及实现方案自由选择。可以调整工程结构、语言与框架，保留可演示的完整业务流程。

### 业务要求

- **R1 写作与提交**：作者可以保存草稿、正式提交、查看待审核与处理结果。草稿与正式提交应清楚区分。退回必须带有意见，作者可以修改后再次提交。
- **R2 人工审核与权限**：审核人员可以查看提交内容并作出通过或退回决定；发布人员可以发布或取消发布。普通作者不得审核或发布；审核者与发布者可以是同一人。权限限制由服务端执行。
- **R3 可信发布**：首次发布和后续更新都必须对应人工通过的内容版本。标题、正文及公开摘要不得因未审核修改而泄露新内容。修改已发布文章时，旧的已审核内容继续可见，直到新版本经过审核并被授权发布，或文章被授权取消发布。不得静默改变正在审核的内容，也不得将旧的审核结论套用到新的修改上。
- **R4 多人编辑**：作者与编辑可以先后编辑同一篇文章。两人基于旧内容保存时，不得静默覆盖彼此的工作。应提供可理解的冲突提示、继续处理方式，以及能够辨认相关版本和变化的信息。无需实现实时协同、自动合并或完整 Git 功能。
- **R5 操作追溯**：有权限的人员能够查询关键修改、提交、审核、发布与取消发布记录，辨认操作者、时间、内容版本、结果及意见。普通作者不能伪造或修改这些记录。重复点击、请求重试、审核与修改同时发生时，结果应可解释，不产生重复生效或错误发布。
- **R6 工程交付**：提供实际运行的前后端、持久化数据和必要测试。交付说明包含运行、验证、部署及数据恢复方法。重启后可以继续处理已有文章。按实际数据变更说明处理方式。

### 演示与交付

演示草稿到审核发布的完整流程，以及退回后重提、已发布文章继续修改、两人编辑冲突、越权操作被拒绝、重复请求和服务重启后的结果。

提交源码、运行说明、主要设计取舍、测试方法与结果，并说明尚未完成的部分。建议投入 24–32 小时，在 7 个自然日内分配；提交时间和渠道以邀请约定为准。

## 工程已有能力

- 登录、退出、服务端会话、CSRF 校验及作者、编辑、审核、发布角色。
- 文章列表、搜索、分页、草稿创建与保存、发布和取消发布。
- 作者访问自己的文章，编辑修改团队文章，发布人员负责发布；审核账号目前可以阅读团队文章。
- Vue 工作台、Thymeleaf 公开列表与阅读页、H2 文件数据库、初始化数据和自动化测试。

当前文章保存到同一条内容记录。发布人员可以直接发布；保存已发布文章会更新公开内容，过期编辑也会覆盖当前内容。正式提交、审核决议、独立内容版本、冲突处理和审计记录需要按 R1–R6 完成。

## 技术与复用

| 部分       | 技术                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| 后端       | Java 21、Spring Boot 4.1.1、WebFlux、Spring Security                      |
| 数据访问   | Spring Data R2DBC、H2 文件数据库                                          |
| 工作台     | Vue 3、TypeScript、Pinia、Vue Router、Tailwind CSS                        |
| 公开阅读   | Thymeleaf                                                                 |
| 构建与测试 | Gradle Wrapper、Node.js 24、pnpm 11.17.0、Vite、JUnit、Vitest、Playwright |

复用 Halo v2.26.1 的分页处理、口令编码配置、状态组件、空页面组件、日期工具和构建配置。复用文件与改动见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，许可证见 [LICENSE](LICENSE)。工程包含所需业务源码，可独立运行。

## 启动

准备 JDK 21、Node.js 24（至少 24.11.0，含 Corepack）。在项目目录执行：

```sh
cd ui
corepack pnpm install --frozen-lockfile
corepack pnpm build
cd ..
./gradlew :backend:bootRun
```

访问 http://localhost:8090 ，工作台为 http://localhost:8090/console/ 。初次启动自动初始化演示数据。Windows 使用 `gradlew.bat`。

首次安装会下载构建工具和依赖，无需另外安装数据库或获取其他业务工程。

### 演示账号

默认密码均为 `Workbench2026!`。

| 账号      | 姓名       | 角色             |
| --------- | ---------- | ---------------- |
| alice     | 林晓       | 作者             |
| bob       | 陈远       | 作者             |
| editor    | 周宁       | 编辑             |
| reviewer  | 苏晴       | 审核人员         |
| publisher | 许言       | 发布人员         |
| manager   | 内容负责人 | 编辑、审核、发布 |

初始化包含一篇已发布文章和两篇草稿。重复启动保留已有账号与文章。可在首次启动前通过 `DEMO_PASSWORD` 指定演示口令；该配置不会修改已有账号的口令。

### 前端开发

保持后端运行，在另一个终端执行：

```sh
cd ui
corepack pnpm dev
```

通过 http://localhost:3000/console/ 访问支持热更新的工作台，公开阅读仍访问后端 8090 端口。改变后端端口时，给前端设置 `API_PORT` 和 `VITE_PUBLIC_ORIGIN`。

## 验证与构建

在项目目录运行：

```sh
./gradlew :backend:test
cd ui
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
cd ..
./gradlew :backend:bootJar
cd ui
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

浏览器测试自动启动打包后的应用，使用独立内存数据库与 4187 端口。基础测试覆盖起始工程已有能力，新增业务需要补充验证。

打包产物为 `backend/build/libs/article-workbench.jar`，包含后端、工作台静态资源及公开阅读模板。在项目目录执行：

```sh
java -jar backend/build/libs/article-workbench.jar
```

运行产物只需要 Java 21。按 Ctrl+C 停止，重新运行上述命令即可恢复服务。

## 数据与配置

默认数据目录为运行目录下的 `data`，使用 H2 文件数据库。开发启动与在项目目录运行 JAR 时使用同一数据目录。账号、文章在重启后保留，会话失效后重新登录。

| 环境变量          | 含义                     | 默认值                                |
| ----------------- | ------------------------ | ------------------------------------- |
| PORT              | 后端端口                 | 8090                                  |
| HOST              | 监听地址                 | 127.0.0.1                             |
| DATABASE_URL      | R2DBC 数据库地址         | 项目内 H2 文件库，见 application.yaml |
| DATABASE_PASSWORD | 数据库口令               | 空                                    |
| DEMO_DATA         | 初始化演示账号与文章     | true                                  |
| DEMO_PASSWORD     | 新建演示账号的口令       | Workbench2026!                        |
| COOKIE_SECURE     | Cookie 仅通过 HTTPS 发送 | false                                 |

部署时构建并运行 JAR，持久化数据目录；使用 HTTPS 时设置 `COOKIE_SECURE=true`。演示账号和示例文章用于本题开发与验收。

备份时先停止应用，再复制完整 `data` 目录。恢复时停止应用，用完整备份替换该目录后启动。初始化文章为合成数据，可按设计重新初始化；候选人交付后的业务数据须在重启后保留。

## 代码结构

```text
backend/
  src/main/java/dev/workbench/   接口、认证、业务服务、数据库访问
  src/main/resources/           配置、DDL、Thymeleaf 模板
  src/test/                     后端测试
ui/
  src/views/                    登录、列表、编辑
  src/components/               Vue 公共组件
  src/stores/                   Pinia 认证状态
  src/utils/                    日期工具
  tests/                        单元测试、浏览器测试
gradle/wrapper/                 Gradle Wrapper
```

`ArticleService` 负责文章操作，`ArticleController` 提供接口，`PageController` 提供公开页面。数据库定义在 `backend/src/main/resources/schema.sql`，目前包含 users 和 articles 两张表。

### 现有接口

| 方法与路径                       | 用途                                 |
| -------------------------------- | ------------------------------------ |
| GET /api/health                  | 服务及数据库检查                     |
| GET /api/csrf                    | 获取写请求使用的 CSRF token          |
| GET /api/session                 | 当前账号                             |
| POST /api/session                | 账号口令登录                         |
| DELETE /api/session              | 退出                                 |
| GET /api/articles                | 按权限查询文章，支持 q、status、page |
| POST /api/articles               | 创建草稿                             |
| GET /api/articles/:id            | 读取文章                             |
| PUT /api/articles/:id            | 保存文章                             |
| POST /api/articles/:id/publish   | 发布                                 |
| POST /api/articles/:id/unpublish | 取消发布                             |
| GET /api/public/articles         | 公开列表                             |
| GET /api/public/articles/:id     | 公开详情                             |

写请求需要保留 Cookie，并携带 `GET /api/csrf` 返回的 headerName 和 token。登录参数为 username、password。创建与保存参数为 title、excerpt、body，长度上限分别为 200、500、50,000 字符。详情返回 `{ article }`，列表返回 `{ items, total, page, size }` 及分页信息。接口和数据结构可随业务实现调整。

## 提交源码

源码包不包含依赖缓存、构建结果、数据库、会话或私人配置。解压后可以初始化 Git 并提交基线，交付时保留可辨认的修改记录及最终 commit。上传 GitHub 时保留许可证和复用来源，不包含面试官材料。
