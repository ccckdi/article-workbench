import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Outlet,
  useBlocker,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { Article, ArticleInput, ArticleList, Role } from "../shared/types";
import { api } from "./api";
import { useAuth } from "./auth";

const roleNames: Record<Role, string> = {
  author: "作者",
  editor: "编辑",
  reviewer: "审核人员",
  publisher: "发布人员",
};
const dateText = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const preview = (article: Article) =>
  article.excerpt ||
  article.body.replace(/\s+/g, " ").slice(0, 140) ||
  "还没有正文内容";
function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">文</span>
      <span>
        文章工作台<small>ARTICLE WORKBENCH</small>
      </span>
    </Link>
  );
}
function ErrorNotice({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      {message}
    </div>
  ) : null;
}
function Loading() {
  return (
    <div className="loading" role="status">
      正在加载内容…
    </div>
  );
}
function Badge({ status }: { status: Article["status"] }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {status === "published" ? "已发布" : "草稿"}
    </span>
  );
}
function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-symbol">≡</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (auth.user) return <Navigate to="/workspace" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await auth.login(username, password);
      const target = location.state?.from;
      navigate(
        typeof target === "string" && target.startsWith("/workspace")
          ? target
          : "/workspace",
        { replace: true },
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <p className="eyebrow">THOUGHTS INTO WORDS</p>
          <h1>
            让好的想法，
            <br />
            有一个开始。
          </h1>
          <p>
            在这里写下观察、分享经验，
            <br />
            让内容连接每一个人。
          </p>
          <div className="story-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <span className="muted">写作 · 协作 · 分享</span>
      </div>
      <main className="login-form">
        <Link className="back-link" to="/">
          ← 浏览公开站点
        </Link>
        <div>
          <p className="eyebrow">欢迎回来</p>
          <h2>登录工作台</h2>
          <p className="muted">继续记录，继续创造。</p>
          <form onSubmit={submit}>
            <label>
              账号
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入账号"
              />
            </label>
            <label>
              密码
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
              />
            </label>
            <ErrorNotice message={error || auth.error} />
            <button className="primary full" disabled={busy}>
              {busy ? "正在登录…" : "登录 →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export function WorkspaceLayout() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  if (auth.loading) return <Loading />;
  if (!auth.user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">内容空间</p>
        <nav>
          <Link className="nav-item active" to="/workspace">
            <span>▤</span>文章管理
          </Link>
          <Link className="nav-item" to="/">
            <span>↗</span>公开站点
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <span className="avatar">{auth.user.displayName[0]}</span>
            <div>
              <strong>{auth.user.displayName}</strong>
              <small>
                {auth.user.roles.map((r) => roleNames[r]).join(" / ")}
              </small>
            </div>
          </div>
          <button
            className="text-button"
            onClick={async () => {
              try {
                await auth.logout();
                navigate("/login");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            退出登录
          </button>
          <ErrorNotice message={error} />
        </div>
      </aside>
      <main className="workspace-main">
        <Outlet />
      </main>
    </div>
  );
}

export function ArticleListPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const status = params.get("status") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(q);
  const [data, setData] = useState<ArticleList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<ArticleList>(
      `/articles?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page) })}`,
    )
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [q, status, page, reload]);
  const setFilter = (newStatus: string) =>
    setParams({
      ...(q ? { q } : {}),
      ...(newStatus ? { status: newStatus } : {}),
    });
  const writable = user?.roles.some((r) => r === "author" || r === "editor");
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CONTENT LIBRARY</p>
          <h1>文章</h1>
          <p className="muted">每一个想法，都值得被认真记录。</p>
        </div>
        {writable && (
          <Link className="button primary" to="/workspace/new">
            ＋ 新建文章
          </Link>
        )}
      </header>
      <section className="library">
        <div className="toolbar">
          <div className="tabs" aria-label="文章状态">
            {[
              ["", "全部文章"],
              ["draft", "草稿"],
              ["published", "已发布"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={status === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({
                ...(search ? { q: search } : {}),
                ...(status ? { status } : {}),
              });
            }}
          >
            <input
              aria-label="搜索文章"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索文章标题"
            />
            <button aria-label="搜索" title="搜索">
              ⌕
            </button>
          </form>
        </div>
        <div className="list-heading">
          <span>标题与内容</span>
          <span>作者</span>
          <span>状态</span>
          <span>最近更新</span>
          <span />
        </div>
        <ErrorNotice message={error} />
        {error && (
          <button
            className="text-button"
            onClick={() => setReload((n) => n + 1)}
          >
            重新加载
          </button>
        )}
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          data.items.map((article) => (
            <Link
              className="article-row"
              key={article.id}
              to={`/workspace/articles/${article.id}`}
            >
              <div className="article-title">
                <span className="document-mark">文</span>
                <div>
                  <h2>{article.title}</h2>
                  <p>{preview(article)}</p>
                </div>
              </div>
              <span className="row-author">{article.authorName}</span>
              <Badge status={article.status} />
              <time>{dateText(article.updatedAt)}</time>
              <span className="row-arrow">→</span>
            </Link>
          ))
        ) : (
          !error && (
            <Empty
              title={q || status ? "没有找到匹配的文章" : "从第一篇文章开始"}
            >
              {q || status
                ? "换个关键词或筛选条件再试试。"
                : "把脑海中的想法，变成一篇新的草稿。"}
            </Empty>
          )
        )}
        <footer className="list-footer">
          <span>共 {data?.total ?? 0} 篇文章</span>
          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() =>
                setParams({
                  ...Object.fromEntries(params),
                  page: String(page - 1),
                })
              }
            >
              上一页
            </button>
            <span>第 {page} 页</span>
            <button
              disabled={!data || page * data.pageSize >= data.total || loading}
              onClick={() =>
                setParams({
                  ...Object.fromEntries(params),
                  page: String(page + 1),
                })
              }
            >
              下一页
            </button>
          </div>
        </footer>
      </section>
      <p className="page-footnote">
        把复杂的事情想清楚，把有价值的内容留下来。
      </p>
    </>
  );
}

const blank: ArticleInput = { title: "", excerpt: "", body: "" };
const inputOf = (a: Article): ArticleInput => ({
  title: a.title,
  excerpt: a.excerpt,
  body: a.body,
});
export function ArticleEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [draft, setDraft] = useState<ArticleInput>(blank);
  const [baseline, setBaseline] = useState<ArticleInput>(blank);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const blocker = useBlocker(dirty && !busy);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (blocker.state === "blocked") leaveDialog.current?.showModal();
    else leaveDialog.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    setError("");
    setMessage("");
    setArticle(null);
    setDraft(blank);
    setBaseline(blank);
    setLoading(Boolean(id));
    if (id)
      api<{ article: Article }>(`/articles/${id}`)
        .then(({ article: a }) => {
          if (active) {
            setArticle(a);
            setDraft(inputOf(a));
            setBaseline(inputOf(a));
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [id]);
  const editable =
    user?.roles.includes("editor") ||
    (article ? article.authorId === user?.id : user?.roles.includes("author"));
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { article: a } = await api<{ article: Article }>(
        id ? `/articles/${id}` : "/articles",
        { method: id ? "PUT" : "POST", body: JSON.stringify(draft) },
      );
      setArticle(a);
      setDraft(inputOf(a));
      setBaseline(inputOf(a));
      setMessage("已保存");
      if (!id) navigate(`/workspace/articles/${a.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!article || dirty) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { article: a } = await api<{ article: Article }>(
        `/articles/${article.id}/${article.status === "published" ? "unpublish" : "publish"}`,
        { method: "POST" },
      );
      setArticle(a);
      setMessage(a.status === "published" ? "文章已发布" : "文章已取消发布");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (id && !article)
    return (
      <>
        <Link className="back-link" to="/workspace">
          ← 返回文章
        </Link>
        <ErrorNotice message={error} />
      </>
    );
  return (
    <>
      <dialog
        ref={leaveDialog}
        className="leave-dialog"
        aria-labelledby="leave-title"
        onCancel={(event) => {
          event.preventDefault();
          blocker.reset?.();
        }}
      >
        <h2 id="leave-title">离开文章？</h2>
        <p>还有未保存的内容，离开后将丢失这些修改。</p>
        <div>
          <button autoFocus onClick={() => blocker.reset?.()}>
            继续编辑
          </button>
          <button className="primary" onClick={() => blocker.proceed?.()}>
            放弃修改并离开
          </button>
        </div>
      </dialog>
      <div className="editor-top">
        <Link className="back-link" to="/workspace">
          ← 返回文章
        </Link>
        <span className="muted">
          {dirty ? "有未保存的修改" : article ? "修改已保存" : "新建草稿"}
        </span>
      </div>
      <form className="editor-form" onSubmit={save}>
        <header className="editor-header">
          <div>
            <p className="eyebrow">WRITING SPACE</p>
            <h1>{id ? "文章内容" : "新的想法，从这里开始"}</h1>
          </div>
          <div className="editor-actions">
            {article && <Badge status={article.status} />}
            {editable && (
              <button
                className="primary"
                disabled={busy || !draft.title.trim()}
              >
                {busy ? "处理中…" : "保存文章"}
              </button>
            )}
          </div>
        </header>
        <ErrorNotice message={error} />
        {message && (
          <div className="notice success" role="status">
            {message}
          </div>
        )}
        <div className="editor-grid">
          <section className="writing-card">
            <label className="field-label" htmlFor="title">
              文章标题
            </label>
            <input
              id="title"
              className="title-input"
              placeholder="一个清晰、有力量的标题"
              required
              maxLength={200}
              disabled={!editable || busy}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <label className="field-label" htmlFor="body">
              正文
            </label>
            <textarea
              id="body"
              className="body-input"
              placeholder="写下你的内容…"
              maxLength={50000}
              disabled={!editable || busy}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="word-count">
              {draft.body.length.toLocaleString()} 字符
            </div>
          </section>
          <aside className="article-settings">
            <section className="settings-card">
              <h2>文章摘要</h2>
              <p>用一小段话概括文章内容。</p>
              <textarea
                aria-label="文章摘要"
                placeholder="留空时展示正文开头"
                maxLength={500}
                disabled={!editable || busy}
                value={draft.excerpt}
                onChange={(e) =>
                  setDraft({ ...draft, excerpt: e.target.value })
                }
              />
            </section>
            {article && (
              <section className="settings-card">
                <h2>文章信息</h2>
                <dl>
                  <dt>作者</dt>
                  <dd>{article.authorName}</dd>
                  <dt>最近更新</dt>
                  <dd>{dateText(article.updatedAt)}</dd>
                </dl>
                {article.status === "published" && (
                  <Link
                    className="button secondary full"
                    to={`/articles/${article.id}`}
                  >
                    查看公开文章 ↗
                  </Link>
                )}
                {user?.roles.includes("publisher") && (
                  <>
                    <button
                      type="button"
                      className={`full ${article.status === "published" ? "secondary" : "primary"}`}
                      onClick={publish}
                      disabled={busy || dirty}
                    >
                      {article.status === "published" ? "取消发布" : "发布文章"}
                    </button>
                    {dirty && <p>请先保存修改，再进行发布操作。</p>}
                  </>
                )}
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}

export function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="public-site">
      <header className="public-header">
        <Brand />
        <Link className="button secondary" to={user ? "/workspace" : "/login"}>
          {user ? "进入工作台" : "登录工作台"} →
        </Link>
      </header>
      <Outlet />
      <footer className="public-footer">
        <span>文章工作台</span>
        <span>记录想法，让内容发生。</span>
      </footer>
    </div>
  );
}
export function PublicFeed() {
  const [data, setData] = useState<ArticleList | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api<ArticleList>(`/public/articles?page=${page}`)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page]);
  return (
    <main className="public-main">
      <section className="public-hero">
        <p className="eyebrow">OUR JOURNAL</p>
        <h1>
          分享所见，
          <br />
          记录所想。
        </h1>
        <p>在文字中交换观点，在分享中发现新的可能。</p>
      </section>
      <div className="section-heading">
        <h2>最新文章</h2>
        <span>{data ? `${data.total} 篇内容` : ""}</span>
      </div>
      <ErrorNotice message={error} />
      {!data && !error ? (
        <Loading />
      ) : data?.items.length ? (
        <div className="public-grid">
          {data.items.map((a, i) => (
            <Link className="public-card" to={`/articles/${a.id}`} key={a.id}>
              <span className="card-number">
                {String((page - 1) * 20 + i + 1).padStart(2, "0")}
              </span>
              <h2>{a.title}</h2>
              <p>{preview(a)}</p>
              <div>
                <span>
                  {a.authorName} · {dateText(a.publishedAt || a.updatedAt)}
                </span>
                <b>↗</b>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !error && <Empty title="还没有公开文章">新的内容即将到来。</Empty>
      )}
      {data && data.total > data.pageSize && (
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span>第 {page} 页</span>
          <button
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </main>
  );
}
export function PublicArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setArticle(null);
    setError("");
    api<{ article: Article }>(`/public/articles/${id}`)
      .then((d) => {
        if (active) setArticle(d.article);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <main className="reader">
      <Link className="back-link" to="/">
        ← 全部文章
      </Link>
      {error ? (
        <ErrorNotice message={error} />
      ) : !article ? (
        <Loading />
      ) : (
        <article>
          <p className="eyebrow">JOURNAL / 文章</p>
          <h1>{article.title}</h1>
          <div className="reader-meta">
            <span className="avatar">{article.authorName[0]}</span>
            {article.authorName}
            <span>·</span>
            <time>{dateText(article.publishedAt || article.updatedAt)}</time>
          </div>
          {article.excerpt && (
            <p className="reader-excerpt">{article.excerpt}</p>
          )}
          <div className="reader-body">{article.body}</div>
        </article>
      )}
    </main>
  );
}
export function NotFound() {
  return (
    <main className="empty">
      <h1>页面不存在</h1>
      <Link className="button primary" to="/">
        返回首页
      </Link>
    </main>
  );
}
