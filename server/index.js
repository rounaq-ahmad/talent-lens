require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config(); // fallback: server/.env for local dev

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  app.use(cors({ origin: /^http:\/\/localhost(:\d+)?$/ }));
}
app.use(express.json());

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/questions',   require('./routes/questions'));
app.use('/api/test',        require('./routes/test'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/candidates', require('./routes/candidates'));

if (isProd) {
  const staticDir = path.join(__dirname, '../dist/talent-lens/browser');
  app.use(express.static(staticDir));
  app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`));
