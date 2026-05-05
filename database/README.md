# Database Structure

## Tables
| Table | Purpose |
|-------|---------|
| books | 书籍基本信息 |
| lessons | 每本书按天拆分的课节，含音频URL |
| vocabulary | 每节课的词汇 |
| user_profiles | 用户信息和订阅状态（含 pl_beta_access — Personal Library 内测开关） |
| progress | 用户学习进度（听到哪里，发音评分） |
| streaks | 连续学习天数 |
| user_books | Personal Library — 用户上传的书的主记录（v2.6.0+） |
| user_book_chunks | Personal Library — 按"每日分钟数"切分的每日阅读单元（v2.6.0+） |
| user_book_vouchers | Personal Library — 完成奖励代金券（v2.6.0+） |
| book_processing_jobs | Personal Library — 后台 worker 队列（v2.6.0+，仅 service role 访问） |

## Key relationships
- 1 book → 1-4 lessons（按天）
- 1 lesson → 2 audio files（阅读 + 讲解）
- 1 lesson → N vocabulary items
- 1 user → N progress records（每课一条）

## Audio upload workflow
1. 在 Supabase Storage 创建 bucket: readii-content
2. 按 books/{book_id}/ 路径上传音频
3. 把 URL 写入 lessons 表对应字段
4. is_published = true 后用户可见
