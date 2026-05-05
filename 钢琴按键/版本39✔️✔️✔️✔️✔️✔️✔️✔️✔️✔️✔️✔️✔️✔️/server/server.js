const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

const SONGS_DIR = path.join(__dirname, 'saved_songs');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'piano-fft.html'));
});

app.post('/api/save-song', (req, res) => {
  const { fileName, content } = req.body;
  
  if (!fileName || !content) {
    return res.status(400).json({ success: false, message: '文件名和内容不能为空' });
  }
  
  const filePath = path.join(SONGS_DIR, `${fileName}.txt`);
  
  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error('保存文件失败:', err);
      return res.status(500).json({ success: false, message: '保存失败' });
    }
    res.json({ success: true, message: '保存成功' });
  });
});

app.get('/api/list-songs', (req, res) => {
  fs.readdir(SONGS_DIR, (err, files) => {
    if (err) {
      console.error('读取目录失败:', err);
      return res.status(500).json({ success: false, message: '读取失败' });
    }
    
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    const songList = txtFiles.map(file => ({
      name: file.replace('.txt', ''),
      path: file
    }));
    
    res.json({ success: true, data: songList });
  });
});

app.get('/api/load-song/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(SONGS_DIR, `${fileName}.txt`);
  
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error('读取文件失败:', err);
      return res.status(500).json({ success: false, message: '读取失败' });
    }
    res.json({ success: true, content });
  });
});

app.delete('/api/delete-song/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(SONGS_DIR, `${fileName}.txt`);
  
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('删除文件失败:', err);
      return res.status(500).json({ success: false, message: '删除失败' });
    }
    res.json({ success: true, message: '删除成功' });
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});