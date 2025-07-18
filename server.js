  const express = require('express');
  const cors = require('cors');
  const pool = require('./db'); // PostgreSQL client (pg Pool)

  const app = express();
  app.use(cors());
  app.use(express.static('public'));
  app.use(express.json());

  // Foydalanuvchini olish yoki yaratish
  app.get('/api/user', async (req, res) => {
    const telegram_id = req.query.telegram_id;
    const name = req.query.name || 'No Name';
    const avatar = req.query.avatar || '/img/default.jpg';

    if (!telegram_id) return res.status(400).send('telegram_id kerak');

    try {
      const result = await pool.query(
        'SELECT name, level, xp, rank, score, avatar, coins FROM users WHERE telegram_id = $1',
        [telegram_id]
      );

      if (result.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO users (telegram_id, name, avatar, coins)
          VALUES ($1, $2, $3, 5000)
          RETURNING name, level, xp, rank, score, avatar, coins`,
          [telegram_id, name, avatar]
        );
        console.log(`Yangi foydalanuvchi yaratildi: ${telegram_id}`);
        return res.json(insertResult.rows[0]);
      }

      console.log(`Foydalanuvchi topildi: ${telegram_id}`);
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Server xatolik (/api/user):', err);
      res.status(500).send('Serverda xatolik');
    }
  });

  // RANK STATS
  app.get('/api/rank-stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT rank, COUNT(*) AS count
        FROM users
        GROUP BY rank
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('Rank statistikasi olishda xatolik:', err);
      res.status(500).json({ error: 'Ichki server xatoligi' });
    }
  });

  // TASK LIST
  app.get('/api/tasks', async (req, res) => {
    const { telegram_id } = req.query;

    try {
      const result = await pool.query(`
        SELECT t.id, t.name, t.description, t.reward,
              CASE WHEN ut.task_id IS NOT NULL THEN true ELSE false END AS completed
        FROM tasks t
        LEFT JOIN user_tasks ut ON ut.task_id = t.id AND ut.telegram_id = $1
      `, [telegram_id]);

      res.json(result.rows);
    } catch (err) {
      console.error("Vazifalarni olishda xatolik:", err);
      res.status(500).json({ error: "Ichki server xatoligi" });
    }
  });

  // Complete Task
  app.post('/api/complete-task', async (req, res) => {
    const { telegram_id, task_id } = req.body;

    try {
      await pool.query(`
        INSERT INTO user_tasks (telegram_id, task_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [telegram_id, task_id]);

      res.json({ message: "✅ Vazifa bajarilgan deb belgilandi!" });
    } catch (err) {
      console.error("Taskni belgilashda xatolik:", err);
      res.status(500).json({ error: "Xatolik yuz berdi" });
    }
  });

  // Update Balance
  app.post('/api/update-balance', async (req, res) => {
    const { telegram_id, amount } = req.body;
    console.log(`So‘rov keldi: telegram_id=${telegram_id}, amount=${amount}`);

    if (!telegram_id || typeof amount !== 'number') {
      console.log('Noto‘g‘ri so‘rov: telegram_id yoki amount xato');
      return res.status(400).send("Bad Request");
    }

    try {
      // Foydalanuvchini olish
      const result = await pool.query(
        'SELECT coins FROM users WHERE telegram_id = $1',
        [telegram_id]
      );

      if (result.rows.length === 0) {
        console.log(`Foydalanuvchi topilmadi: ${telegram_id}`);
        return res.status(404).send("User not found");
      }

      const user = result.rows[0];
      const currentBalance = user.coins;

      // Balansni tekshirish
      if (amount < 0 && currentBalance < Math.abs(amount)) {
        console.log(`Mablag‘ yetmaydi: joriy balans=${currentBalance}, amount=${amount}`);
        return res.status(400).send("Mablag‘ yetmaydi");
      }

      const newScore = currentBalance + amount;
      if (newScore < 0) {
        console.log(`Balans salbiy bo‘lishi mumkin emas: newScore=${newScore}`);
        return res.status(400).send("Mablag‘ yetmaydi");
      }

      // Balansni yangilash
      await pool.query(
        'UPDATE users SET coins = $1 WHERE telegram_id = $2',
        [newScore, telegram_id]
      );

      console.log(`Balans yangilandi: telegram_id=${telegram_id}, yangi balans=${newScore}`);
      res.json({ success: true, newScore });
    } catch (err) {
      console.error('Update balance xatosi:', err);
      res.status(500).send("Server error");
    }
  });




  // Start server
  app.listen(3000, () => {
    console.log('✅ Server ishlayapti: http://localhost:3000');
  });