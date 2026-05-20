require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = 3000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/hai_participant.html');
});

app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages, max_tokens } = req.body;

    // Groq uses OpenAI-compatible format — prepend system as first message
    const groqMessages = [
      { role: 'system', content: system },
      ...messages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        max_tokens: max_tokens || 1000
      })
    });

    const data = await response.json();

    console.log('Groq status:', response.status);

    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(response.status).json({ error: data });
    }

    // Convert Groq response → format the frontend expects
    const text = data.choices?.[0]?.message?.content
      || 'Sorry, I could not generate feedback at this time.';

    res.json({ content: [{ text }] });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Failed to reach Groq API: ' + err.message });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Supabase error:', err);
      return res.status(response.status).json({ error: err });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/hai_participant.html in your browser`);
});
