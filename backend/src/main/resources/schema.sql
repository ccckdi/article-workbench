CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    display_name VARCHAR(80) NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    roles VARCHAR(256) NOT NULL
);
COMMENT ON TABLE users IS '业务账号';
COMMENT ON COLUMN users.id IS '账号 ID';
COMMENT ON COLUMN users.username IS '登录账号';
COMMENT ON COLUMN users.display_name IS '显示姓名';
COMMENT ON COLUMN users.password_hash IS '口令编码值';
COMMENT ON COLUMN users.roles IS '业务角色集合';

CREATE TABLE IF NOT EXISTS articles (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500) NOT NULL DEFAULT '',
    body CLOB NOT NULL,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);
COMMENT ON TABLE articles IS '文章';
COMMENT ON COLUMN articles.id IS '文章 ID';
COMMENT ON COLUMN articles.title IS '文章标题';
COMMENT ON COLUMN articles.excerpt IS '文章摘要';
COMMENT ON COLUMN articles.body IS '文章正文';
COMMENT ON COLUMN articles.author_id IS '作者账号 ID';
COMMENT ON COLUMN articles.status IS '发布状态';
COMMENT ON COLUMN articles.created_at IS '创建时间';
COMMENT ON COLUMN articles.updated_at IS '最近更新时间';
COMMENT ON COLUMN articles.published_at IS '最近发布时间';
CREATE INDEX IF NOT EXISTS articles_author_idx ON articles(author_id);
CREATE INDEX IF NOT EXISTS articles_status_updated_idx ON articles(status, updated_at);
