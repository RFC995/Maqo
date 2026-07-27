const { contextBridge, ipcRenderer } = require('electron')

/**
 * The only surface the renderer gets. Context isolation is on and Node is off,
 * so the app can reach exactly these calls and nothing else.
 */
contextBridge.exposeInMainWorld('maqo', {
  ehDesktop: true,

  // licence (used by the activation window)
  ativarLicenca: (chave) => ipcRenderer.invoke('licenca:ativar', chave),
  estadoLicenca: () => ipcRenderer.invoke('licenca:estado'),

  // project files
  guardarProjeto: (conteudo, comoNovo, nomeSugerido) =>
    ipcRenderer.invoke('projeto:guardar', { conteudo, comoNovo, nomeSugerido }),
  caminhoAtual: () => ipcRenderer.invoke('projeto:caminho-atual'),

  // report
  guardarRelatorioPdf: (nomeSugerido) => ipcRenderer.invoke('relatorio:pdf', nomeSugerido),

  // LNS (ChirpStack)
  lnsGuardarLigacao: (dados) => ipcRenderer.invoke('lns:guardar-ligacao', dados),
  lnsObterLigacao: () => ipcRenderer.invoke('lns:obter-ligacao'),
  lnsRemoverLigacao: () => ipcRenderer.invoke('lns:remover-ligacao'),
  lnsTestarLigacao: (dados) => ipcRenderer.invoke('lns:testar-ligacao', dados),
  lnsListarDispositivos: () => ipcRenderer.invoke('lns:listar-dispositivos'),
  lnsDefinirSubscricoes: (devEuis) => ipcRenderer.invoke('lns:definir-subscricoes', devEuis),
  aoReceberLeituraLns: (callback) => {
    const handler = (_evento, leituras) => callback(leituras)
    ipcRenderer.on('lns:leitura', handler)
    return () => ipcRenderer.off('lns:leitura', handler)
  },

  // menu events -> renderer
  aoAbrirProjeto: (callback) => {
    const handler = (_evento, payload) => callback(payload)
    ipcRenderer.on('projeto:abrir', handler)
    return () => ipcRenderer.off('projeto:abrir', handler)
  },
  aoPedirParaGuardar: (callback) => {
    const handler = (_evento, payload) => callback(payload)
    ipcRenderer.on('projeto:pedir-para-guardar', handler)
    return () => ipcRenderer.off('projeto:pedir-para-guardar', handler)
  },
  aoNovoProjeto: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('projeto:novo', handler)
    return () => ipcRenderer.off('projeto:novo', handler)
  },
})
