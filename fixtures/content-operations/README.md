# 内容运营业务数据

这些文件是本题提供的合成历史资料，不含真实用户或企业数据。原始文件用于导入和核对，请保留原件；处理、存储、指标和页面由候选人实现。

业务目标是帮助新成员自助完成办事任务，优先减少看过指南后仍需人工解释的问题。下一轮最多改进 3 篇文章，编辑预算为 8 小时，成本使用 articles.csv 的 estimated_revision_hours。结论无唯一排序，选择须有可复核依据。

## 文件与时间

| 文件 | 内容 |
| --- | --- |
| articles.csv | 8 篇文章的历史内容快照与改进工时估算 |
| reading-events-01.csv、reading-events-02.csv | 同一期间的两个阅读事件导出批次，可能重叠，无先后覆盖含义 |
| feedback.csv | 读者主动提交的反馈，不是每次访问都有反馈 |
| support-cases.csv | 人工支持登记的咨询，记录单位是一次咨询，不是一次访问或一个人 |
| manifest.json | 文件原始行数、SHA-256、观察期间和导出截止时间 |

编码 UTF-8，CSV 首行为字段名；正文可能包含换行，需使用 CSV 解析器。时间为 ISO 8601，正常值包含时区偏移。分析范围为北京时间 2026-08-01 00:00（包含）至 2026-08-15 00:00（不包含）；导出截止北京时间 2026-08-17 00:00。按 occurred_at 或 created_at 选择业务发生期间，received_at 表示服务端收到事件的时间。

字段出现于导出表中不代表值总是有效。资料可能有重复行、同一 ID 内容冲突、空字段、非法值、迟到或顺序异常、未知文章关联和自动访问。发现后的处理规则及对结论的影响由候选人说明。manifest 的行数是原始记录数，不是有效事件、访问量或人数。

历史与现场采集是不同数据来源，须能分别查看；历史资料中的 published_version 不代表本系统的批准记录。选定历史文章后，可将快照导入为新的修订草稿并关联来源，再走本题的审核发布流程。不要直接把历史字段作为绕过审核的发布指令。

## articles.csv

| 字段 | 含义 |
| --- | --- |
| article_id | 历史文章稳定标识，可关联其他文件 |
| title、excerpt、body | 文章标题、摘要和正文快照 |
| topic | 办事主题 |
| published_at | 该快照版本的历史发布时间 |
| published_version | 历史内容版本标识 |
| estimated_revision_hours | 本轮完成该篇修订的编辑工时估算，包含编辑和核对，不是实测耗时 |

8 篇文章的具体修订内容由候选人根据证据提出。无需创建通用任务管理系统；改进计划能保存选择、理由、成本，并关联修订文章与进度即可。

## reading-events-*.csv

| 字段 | 含义 |
| --- | --- |
| event_id | 上报方事件标识，重传应保持不变；不同批次可能重复或出现冲突 |
| session_id | 浏览器产生的一次文章访问会话标识，可关联该次 page_view、read_end 和反馈；缺失时不可可靠关联 |
| anonymous_id | 合成浏览器标识，可能为空；同一个人可使用多个浏览器，同一浏览器也可能由多人使用 |
| article_id、content_version | 访问的历史文章及内容版本 |
| event_type | page_view 表示页面访问，read_end 表示阅读结束时的上报；可能出现未约定类型 |
| occurred_at、received_at | 客户端记录的发生时间、服务端收到时间 |
| channel | 来源渠道：search、home、campaign、direct；可能缺失 |
| device | desktop 或 mobile |
| client_agent | browser、crawler 或 unknown；由客户端与采集端识别，是判断线索，不是身份保证 |
| duration_seconds | read_end 上报的页面停留秒数；page_view 通常为空，不等于实际阅读时间 |
| scroll_percent | read_end 上报的最大滚动百分比，约定 0–100；短页面滚动少也可能已看完 |

一个访问可能只有 page_view，没有 read_end；两个事件不能简单相加当成两次阅读。网络、页面关闭、浏览器状态或自动访问都会影响上报。指标是否采用时长或滚动、阈值如何设置及分母如何选择，由候选人定义并解释。

## feedback.csv

| 字段 | 含义 |
| --- | --- |
| feedback_id | 一次反馈提交标识，可能重复 |
| session_id | 对应访问会话，可能缺失或无法匹配 |
| article_id、content_version | 反馈指向的文章及版本 |
| occurred_at、received_at | 反馈发生及收到时间 |
| value | helpful 或 unhelpful；非法取值须处理 |
| comment | 合成反馈文本，可能只表达局部体验，不保证完成了任务 |

反馈由读者主动提供，存在选择偏差。没有反馈不能自动解释为满意或不满意。关联渠道时，应说明无法关联的反馈如何处理，避免跨渠道借用分母。

## support-cases.csv

| 字段 | 含义 |
| --- | --- |
| ticket_id | 咨询记录标识，可能重复 |
| created_at | 人工登记时间 |
| topic | 支持人员登记的主题 |
| article_id | 被提及的文章，可为空；主题相同不等于确认看过某篇文章 |
| reported_read_article | 咨询者是否自述阅读过指南：yes、no、unknown |
| summary | 合成问题摘要 |
| handling_minutes | 登记的处理分钟数，可能缺失 |

咨询记录没有访问会话或个人身份字段，不能强行逐人关联阅读事件。数据不包含所有办事尝试、全量人工支持或随机实验，不足以单独证明修改文章导致咨询减少。可以提出后续观测或验证计划，不要求在本次演示中取得真实效果。
