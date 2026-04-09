-- 示例数据：一本书，分2天

INSERT INTO books (title, series, level, total_days, age_min, age_max, description_zh)
VALUES (
  'The Very Hungry Caterpillar',
  'Heinemann',
  2,
  2,
  3, 7,
  '好饿的毛毛虫——经典绘本，认识星期和食物词汇'
)
RETURNING id;

-- 假设上面返回的 book_id = 'xxx'，再插入课节：
-- INSERT INTO lessons (book_id, day_number, title, sort_order)
-- VALUES ('xxx', 1, 'Day 1 — The egg and Monday', 1);
-- VALUES ('xxx', 2, 'Day 2 — Tuesday to Sunday', 2);
