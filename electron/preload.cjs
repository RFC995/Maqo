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

  // TTN / ChirpStack integration
  integracaoLigar: (config) => ipcRenderer.invoke('integracao:ligar', config),
  integracaoDesligar: () => ipcRenderer.invoke('integracao:desligar'),
  integracaoEstado: () => ipcRenderer.invoke('integracao:estado'),
  aoUplinkIntegracao: (callback) => {
    const handler = (_evento, payload) => callback(payload)
    ipcRenderer.on('integracao:uplink', handler)
    return () => ipcRenderer.off('integracao:uplink', handler)
  },
  aoEstadoIntegracao: (callback) => {
    const handler = (_evento, payload) => callback(payload)
    ipcRenderer.on('integracao:estado', handler)
    return () => ipcRenderer.off('integracao:estado', handler)
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
