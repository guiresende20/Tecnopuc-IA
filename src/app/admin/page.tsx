'use client';

import { useState, useEffect } from 'react';
import './admin.css'; // Add some basic styling if needed

export default function AdminPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'docs' | 'prompt'>('docs');
  const [sources, setSources] = useState<any[]>([]);
  
  // Settings States
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState('0.5');
  const [thinkingLevel, setThinkingLevel] = useState('low');
  const [similarityThreshold, setSimilarityThreshold] = useState('80');
  const [matchCount, setMatchCount] = useState('5');
  const [voice, setVoice] = useState('Aoede');
  const [maxTokens, setMaxTokens] = useState('1024');
  
  // Forms
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const login = () => {
    const token = btoa(`${username}:${password}`);
    setAuthHeader(`Basic ${token}`);
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: { 'Authorization': authHeader! } });
      if (res.ok) {
        const data = await res.json();
        setSystemPrompt(data.system_prompt || '');
        if (data.temperature) setTemperature(data.temperature);
        if (data.thinkingLevel) setThinkingLevel(data.thinkingLevel);
        if (data.similarityThreshold) setSimilarityThreshold(data.similarityThreshold);
        if (data.matchCount) setMatchCount(data.matchCount);
        if (data.voice) setVoice(data.voice);
        if (data.maxTokens) setMaxTokens(data.maxTokens);
      } else {
        setAuthHeader(null); // Invalid creds
      }
    } catch (e) {}
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/admin/sources', { headers: { 'Authorization': authHeader! } });
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (authHeader) {
      fetchSettings();
      fetchSources();
    }
  }, [authHeader]);

  const saveSettings = async () => {
    setLoading(true);
    setLoadingMessage('Salvando nova personalidade...');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          system_prompt: systemPrompt,
          temperature,
          thinkingLevel,
          similarityThreshold,
          matchCount,
          voice,
          maxTokens
        })
      });
      if (res.ok) alert('Personalidade salva com sucesso!');
      else alert('Erro ao salvar');
    } catch (e) {
      alert('Erro inesperado');
    }
    setLoading(false);
  };

  const addOrUpdateTextDoc = async () => {
    if (!newDocTitle || !newDocContent) return alert('Preencha título e conteúdo');
    setLoading(true);
    const isEditing = editingId !== null;
    setLoadingMessage(isEditing ? 'Atualizando texto vetorial...' : 'Indexando novo texto no RAG...');
    try {
      const res = await fetch('/api/admin/sources', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Authorization': authHeader!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingId, 
          title: newDocTitle, 
          content: newDocContent 
        })
      });
      if (res.ok) {
        alert(`Documento ${isEditing ? 'atualizado' : 'adicionado'} e reindexado ao RAG!`);
        cancelEdit();
        fetchSources();
      } else {
        alert('Falha ao processar documento');
      }
    } catch (e) {}
    setLoading(false);
  };

  const startEdit = (src: any) => {
    setEditingId(src.id);
    setNewDocTitle(src.title);
    setNewDocContent(src.content || ''); // Pega o conteúdo porque agora a API GET retorna fields: id, title, content, type...
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewDocTitle('');
    setNewDocContent('');
  };

  const uploadFile = async () => {
    if (!fileToUpload) return alert('Selecione um arquivo');
    if (fileToUpload.size > 10 * 1024 * 1024) return alert('O arquivo excede o tamanho máximo de 10 MB.');
    
    setLoading(true);
    setLoadingMessage('Fazendo upload e processando embeddings do arquivo...');
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Authorization': authHeader! },
        body: formData
      });
      if (res.ok) {
        alert('Arquivo processado e indexado!');
        setFileToUpload(null);
        fetchSources();
      } else {
        const err = await res.json();
        alert('Erro: ' + err.error);
      }
    } catch (e) {}
    setLoading(false);
  };

  const deleteDoc = async (id: number) => {
    if (!confirm('Deseja realmente apagar e remover do chatbot?')) return;
    setLoading(true);
    setLoadingMessage('Removendo documento e vetores...');
    try {
      const res = await fetch(`/api/admin/sources?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader! }
      });
      if (res.ok) {
        fetchSources();
      } else {
        alert('Falha ao excluir');
      }
    } catch (e) {}
    setLoading(false);
  };

  if (!authHeader) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-box">
          <h2>TecnoPUC Admin</h2>
          <input type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={login}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>Painel de Gestão RAG — TecnoPUC</h2>
        <div className="admin-tabs">
          <button className={activeTab === 'docs' ? 'active' : ''} onClick={() => setActiveTab('docs')}>
            Documentos e PDF
          </button>
          <button className={activeTab === 'prompt' ? 'active' : ''} onClick={() => setActiveTab('prompt')}>
            Personalidade
          </button>
        </div>
        <button className="logout-btn" onClick={() => setAuthHeader(null)}>Sair</button>
      </header>

      <main className="admin-content">
        {loading && (
          <div className="status-bar-container">
            <div className="status-bar-fill"></div>
            <div className="status-bar-text">{loadingMessage || 'Processando de forma assíncrona...'}</div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="admin-panel">
            <h3>Personalidade e Regras da IA</h3>
            <p>Edite o modo como a inteligência artificial interpreta o mundo e como ela fala com os usuários.</p>
            <textarea 
              rows={15}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />

            <div className="settings-grid">
              <div className="setting-card">
                 <h4>Temperatura ({temperature})</h4>
                 <p>Valores baixos (ex: 0.1) tornam a IA factual. Valores altos (ex: 0.8) a tornam criativa.</p>
                 <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} />
              </div>
              <div className="setting-card">
                 <h4>Nível de Raciocínio (Thinking)</h4>
                 <p>No modo Alto, a IA vai raciocinar mais exaustivamente antes de enviar a mensagem final.</p>
                 <select value={thinkingLevel} onChange={e => setThinkingLevel(e.target.value)}>
                    <option value="low">Baixo (Rápido para Chat)</option>
                    <option value="high">Alto (Lento e Profundo)</option>
                 </select>
              </div>
              <div className="setting-card">
                 <h4>Certeza do RAG ({similarityThreshold}%)</h4>
                 <p>Exigência mínima de match antes do RAG usar o arquivo. Evita alucinações da IA.</p>
                 <input type="range" min="0" max="100" step="5" value={similarityThreshold} onChange={e => setSimilarityThreshold(e.target.value)} />
              </div>
              <div className="setting-card">
                 <h4>Tamanho do Contexto</h4>
                 <p>Quantidade máxima textuais (1 a 10) usadas como memória por pergunta.</p>
                 <input type="number" min="1" max="10" value={matchCount} onChange={e => setMatchCount(e.target.value)} />
              </div>
              <div className="setting-card">
                 <h4>Máximo de Tokens</h4>
                 <p>Limita o tamanho total da resposta. (1024 equivale a uns parágrafos curtos).</p>
                 <input type="number" min="100" max="8000" step="100" value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
              </div>
              <div className="setting-card">
                 <h4>Voz do Assistente</h4>
                 <p>O "timbre" da fala do assistente reservado para as APIs Live/TTS do projeto.</p>
                 <select value={voice} onChange={e => setVoice(e.target.value)}>
                    <option value="Aoede">Voz 1 (Aoede)</option>
                    <option value="Puck">Voz 2 (Puck)</option>
                    <option value="Charon">Voz 3 (Charon)</option>
                    <option value="Kore">Voz 4 (Kore)</option>
                 </select>
              </div>
            </div>

            <button className="primary-btn mt" onClick={saveSettings}>Salvar Personalidade</button>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="admin-panel docs-panel">
            <div className="docs-list">
              <h3>Documentos Atuais (Base de Dados do Robô)</h3>
              <ul>
                {sources.map(src => (
                  <li key={src.id}>
                    <span><strong>{src.title}</strong> <em>({src.type})</em> - Última atualização: {new Date(src.created_at).toLocaleDateString()}</span>
                    <div>
                      <button className="primary-btn" style={{padding: '0.4rem 0.8rem'}} onClick={() => startEdit(src)}>Editar</button>
                      <button className="danger-btn" onClick={() => deleteDoc(src.id)}>Apagar</button>
                    </div>
                  </li>
                ))}
                {sources.length === 0 && <li>Nenhum documento cadastrado.</li>}
              </ul>
            </div>

            <div className="docs-actions">
              <div className="docs-add-text">
                <h3>{editingId ? 'Editando Documento Existente' : 'Adicionar Novo Texto Manual'}</h3>
                <input type="text" placeholder="Título do Texto (Ex: Eventos 2026)" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} />
                <textarea rows={18} placeholder="Cole ou edite todo o conteúdo informativo aqui..." value={newDocContent} onChange={e => setNewDocContent(e.target.value)}></textarea>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="primary-btn" onClick={addOrUpdateTextDoc}>
                    {editingId ? 'Salvar e Reindexar Alterações' : 'Salvar e Indexar Texto'}
                  </button>
                  {editingId && (
                    <button className="danger-btn" onClick={cancelEdit}>Cancelar Edição</button>
                  )}
                </div>
              </div>
              <div className="docs-upload">
                <h3>Upload de PDF ou TXT</h3>
                <p>Nós extrairemos o texto automaticamente para injetar na base vetorial (RAG).</p>
                <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>⚠️ Tamanho máximo do arquivo: 10 MB.</p>
                <div style={{ marginTop: '1rem', border: '2px dashed #94a3b8', padding: '2rem', textAlign: 'center', borderRadius: '8px', backgroundColor: '#0f172a' }}>
                  <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: '0.8rem', color: '#38bdf8' }}>📁 Clique aqui para selecionar</div>
                    <div style={{ color: '#cbd5e1', fontWeight: 'bold' }}>
                      {fileToUpload ? fileToUpload.name : 'Nenhum arquivo selecionado'}
                    </div>
                  </label>
                  <input id="file-upload" type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }} onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} />
                </div>
                
                {fileToUpload && (
                  <button className="primary-btn" style={{ marginTop: '1rem', width: '100%', backgroundColor: '#10b981' }} onClick={uploadFile}>
                    Fazer Upload e Extrair Arquivo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
