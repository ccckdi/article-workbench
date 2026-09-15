# 第三方代码与实现来源

本工程使用 GNU GPL v3 发布，完整条款见 LICENSE。复制或改编的 Halo 代码来自 v2.26.1，commit `88c2ef14355c79a4dbd1d5c3246b3ea32836e06b`，原项目为 https://github.com/halo-dev/halo。

| 本工程文件                                                     | Halo 源文件                                                                      | 处理方式                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| backend/src/main/java/dev/workbench/ListResult.java            | api/src/main/java/run/halo/app/extension/ListResult.java                         | 保留分页边界、导航、迭代与首项处理；调整为 Java record，移除 Halo Extension 运行时类型生成和 Swagger 注解 |
| backend/src/main/java/dev/workbench/SecurityConfiguration.java | application/src/main/java/run/halo/app/infra/config/WebServerSecurityConfig.java | 提取 passwordEncoder 方法，沿用 Argon2 默认编码；移除本工程没有使用的历史口令编码                         |
| ui/src/components/StatusDot.vue                                | ui/packages/components/src/components/status/StatusDot.vue                       | 原样复用                                                                                                  |
| ui/src/components/types.ts                                     | ui/packages/components/src/components/status/types.ts                            | 原样复用                                                                                                  |
| ui/src/components/Empty.vue                                    | ui/packages/components/src/components/empty/Empty.vue                            | 原样复用                                                                                                  |
| ui/src/components/Empty.svg                                    | ui/packages/components/src/components/empty/Empty.svg                            | 原样复用                                                                                                  |
| ui/src/utils/date.ts                                           | ui/packages/shared/src/utils/date.ts                                             | 原样复用                                                                                                  |
| gradlew、gradlew.bat、gradle/wrapper/                          | 同名路径                                                                         | 复用 Gradle Wrapper 启动文件，保留原始声明                                                                |
| build.gradle                                                   | application/build.gradle 的 spotless 配置                                        | 沿用 Spotless 与 Palantir Java Format 的版本和 Java 格式规则                                              |
| ui/pnpm-workspace.yaml                                         | ui/pnpm-workspace.yaml                                                           | 沿用本工程涉及的依赖构建权限                                                                              |

Java、Spring Boot、WebFlux、Spring Security、R2DBC、Thymeleaf、Vue、Pinia、Tailwind CSS、Vite、Gradle、pnpm 的使用方式与 Halo 保持一致。文章持久化和页面路由按独立项目编写，工程不加载 Halo 插件或 Extension 运行时。

Vue Router 使用与 Pinia 4 兼容的版本。第三方依赖的版本分别由 Gradle 配置和 ui/pnpm-lock.yaml 锁定，依赖本身适用各自许可证。
