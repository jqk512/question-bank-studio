# 题库工坊 Question Bank Studio

一个从零开发的通用题库导入、拆分、校对、发布和检索工具。配置 Supabase 后使用账号云端同步；未配置时自动回退到浏览器 IndexedDB。

## 当前能力

- 支持 TXT、Markdown、DOCX 和文字型 PDF
- 检测无文本层的扫描版 PDF，避免将 OCR 文件误判为空题库
- 无法识别选择/判断题结构时自动转为文本资料，可按关键词检索和复制片段
- 浏览器本地提取文件内容，云端模式下把源文件上传至用户私有 Storage 目录
- 自动识别题号、题干、选项、答案和题型
- 标记缺少答案、选项不足、答案越界和题号异常
- 提供逐题校对和修改工作台，修正后自动重算异常与题型
- 维护题库名称、简介和发布状态
- 发布为独立题库检索页，并支持复制链接和下线
- 每份导入文件自动生成独立题库子列表，可直接在工作区检索
- 支持建立自定义题库分组、添加或解除成员，并联合检索组内全部题目
- 搜索题干、选项、答案和解析
- 根据搜索结果动态统计单选、多选和判断题数量
- 用户名与密码注册登录，无需邮箱和确认邮件
- 注册采用服务端频率限制与限次邀请码，避免公开接口被批量滥用
- Supabase PostgreSQL、Storage、RLS 和公开题库匿名只读访问
- 未配置 Supabase 时使用 IndexedDB 持久化
- 响应式桌面和移动端布局

## 本地运行

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local` 并填入 Supabase URL 与 publishable key，然后打开 Vite 输出的本地地址。

Supabase Authentication 的 Email Provider 需要保持启用，并关闭 `Confirm email`。应用会把规范化用户名哈希为仅供认证使用的内部邮箱标识，用户界面不会显示该标识，也不会发送邮件。

## 验证

```bash
npm run test
npm run lint
npm run build
```

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后会自动执行 lint、测试、构建并发布 GitHub Pages。

首次部署前需要在 GitHub 仓库中完成：

1. 在 `Settings → Secrets and variables → Actions` 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
2. 在 `Settings → Pages` 将 Source 设置为 `GitHub Actions`。
3. 推送或手动运行 `Deploy Question Bank Studio` workflow。

项目使用 `HashRouter` 和相对静态资源路径，可直接部署在 `https://<username>.github.io/<repository>/` 子目录下。

诊断某份 PDF 的解析结果：

```bash
npm run analyze:pdf -- /absolute/path/to/question-bank.pdf
```

## 题库格式示例

```text
1. 下列哪项是正确的？
A. 选项一
B. 选项二
C. 选项三
D. 选项四
答案：B

2. 以下哪些项目正确？
A. 项目一
B. 项目二
C. 项目三
正确答案：AC
```

## 项目结构

```text
src/
  components/       通用界面组件
  auth/             Supabase 登录状态和账号操作
  lib/              文件提取、规则解析、云端与本地仓储
  pages/            题库管理、导入、校对和检索页面
  types.ts          通用题库数据模型
scripts/
  analyze-pdf.ts    PDF 解析诊断工具
supabase/
  schema.sql        云端数据结构、授权、RLS 和 Storage 策略
  migrations/       可追踪的数据库增量迁移
```

## 账号说明

- 用户名不区分大小写，并使用 NFKC 规范化。
- 密码由 Supabase Auth 加密保存，应用代码无法读取明文。
- 当前无邮箱绑定，因此暂不提供自动找回密码；忘记密码需要管理员重置。
