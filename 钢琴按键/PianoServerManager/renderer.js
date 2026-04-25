const { ipcRenderer } = require('electron');

async function loadVersions() {
  const versions = await ipcRenderer.invoke('getVersions');
  const select = document.getElementById('versionSelect');
  
  select.innerHTML = '<option value="">请选择版本</option>';
  versions.forEach(v => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
  
  addLog('版本列表加载完成');
}

async function startServer() {
  const version = document.getElementById('versionSelect').value;
  
  if (!version) {
    alert('请先选择版本');
    return;
  }
  
  setStatus('working', '正在启动服务器...');
  addLog(`启动版本: ${version}`);
  
  const result = await ipcRenderer.invoke('startServer', version);
  
  if (result.success) {
    setStatus('success', '服务器运行中');
    addLog(result.message);
  } else {
    setStatus('error', '启动失败');
    addLog(result.message);
    alert(result.message);
  }
}

async function stopServer() {
  setStatus('working', '正在停止服务器...');
  addLog('停止服务器');
  
  const result = await ipcRenderer.invoke('stopServer');
  
  if (result.success) {
    setStatus('error', '服务器已停止');
  } else {
    setStatus('success', '就绪');
  }
  addLog(result.message);
}

function openBrowser() {
  ipcRenderer.invoke('openBrowser');
  addLog('打开浏览器');
}

function setStatus(type, text) {
  const icon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  
  icon.className = 'status-icon';
  if (type === 'working') icon.classList.add('working');
  if (type === 'error') icon.classList.add('error');
  
  statusText.textContent = text;
}

function addLog(text) {
  const log = document.getElementById('log');
  const now = new Date();
  const time = now.toLocaleTimeString();
  log.textContent += `\n[${time}] ${text}`;
  log.scrollTop = log.scrollHeight;
}

loadVersions();