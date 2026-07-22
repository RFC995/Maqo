const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const path = require('node:path')

const { verificarChave, guardarLicenca, licencaGuardada, removerLicenca } = require('./licenca.cjs')

const DEV_URL = process.env.VITE_DEV_SERVER_URL
const ehDev = !!DEV_URL

let janela = null
let janelaAtivacao = null
/** Path of the project file currently open, if any. */
let ficheiroAtual = null
let licencaAtiva = null

function tituloJanela() {
  const nome = ficheiroAtual ? path.basename(ficheiroAtual) : 'Projeto sem titulo'
  return `${nome} — Maqo`
}

// ---------------------------------------------------------------- activation

function abrirJanelaAtivacao() {
  janelaAtivacao = new BrowserWindow({
    width: 620,
    height: 720,
    resizable: false,
    title: 'Ativar o Maqo',
    backgroundColor: '#070b14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  janelaAtivacao.setMenuBarVisibility(false)
  janelaAtivacao.loadFile(path.join(__dirname, 'ativacao.html'))
  janelaAtivacao.on('closed', () => {
    janelaAtivacao = null
    // closing the activation window without a licence quits the app
    if (!licencaAtiva) app.quit()
  })
}

ipcMain.handle('licenca:ativar', (_evento, chave) => {
  const resultado = verificarChave(chave)
  if (!resultado.valida) return { ok: false, motivo: resultado.motivo }

  guardarLicenca(app.getPath('userData'), chave, resultado.dados)
  licencaAtiva = resultado.dados

  criarJanela()
  if (janelaAtivacao) {
    const aFechar = janelaAtivacao
    janelaAtivacao = null
    aFechar.close()
  }
  return { ok: true, dados: resultado.dados }
})

ipcMain.handle('licenca:estado', () => licencaAtiva)

ipcMain.handle('licenca:remover', async () => {
  const { response } = await dialog.showMessageBox(janela, {
    type: 'warning',
    buttons: ['Cancelar', 'Desativar'],
    defaultId: 0,
    cancelId: 0,
    message: 'Desativar esta instalacao?',
    detail: 'A aplicacao fecha e volta a pedir a chave no proximo arranque.',
  })
  if (response !== 1) return false
  removerLicenca(app.getPath('userData'))
  app.relaunch()
  app.exit(0)
  return true
})

// ------------------------------------------------------------- project files

const FILTROS = [{ name: 'Projeto Maqo', extensions: ['json'] }]

async function abrirProjeto() {
  const { canceled, filePaths } = await dialog.showOpenDialog(janela, {
    title: 'Abrir projeto Maqo',
    filters: FILTROS,
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return
  try {
    const conteudo = await fs.readFile(filePaths[0], 'utf8')
    ficheiroAtual = filePaths[0]
    janela.setTitle(tituloJanela())
    janela.webContents.send('projeto:abrir', { caminho: filePaths[0], conteudo })
  } catch (erro) {
    dialog.showErrorBox('Nao foi possivel abrir', String(erro.message ?? erro))
  }
}

/** Asks the renderer for the current project, then writes it out. */
function pedirGuardar(comoNovo) {
  janela.webContents.send('projeto:pedir-para-guardar', { comoNovo })
}

ipcMain.handle('projeto:guardar', async (_evento, { conteudo, comoNovo, nomeSugerido }) => {
  let destino = ficheiroAtual
  if (comoNovo || !destino) {
    const { canceled, filePath } = await dialog.showSaveDialog(janela, {
      title: 'Guardar projeto Maqo',
      defaultPath: destino ?? `${nomeSugerido || 'maquete'}.json`,
      filters: FILTROS,
    })
    if (canceled || !filePath) return { ok: false }
    destino = filePath
  }
  try {
    await fs.writeFile(destino, conteudo, 'utf8')
    ficheiroAtual = destino
    janela.setTitle(tituloJanela())
    return { ok: true, caminho: destino }
  } catch (erro) {
    dialog.showErrorBox('Nao foi possivel guardar', String(erro.message ?? erro))
    return { ok: false }
  }
})

ipcMain.handle('projeto:caminho-atual', () => ficheiroAtual)

/**
 * Renders the report straight to a PDF file. Better than window.print(): no
 * print dialog, real A4 page breaks, and it lands where the user chooses.
 */
ipcMain.handle('relatorio:pdf', async (_evento, nomeSugerido) => {
  const { canceled, filePath } = await dialog.showSaveDialog(janela, {
    title: 'Guardar relatorio',
    defaultPath: `${nomeSugerido || 'relatorio'}.pdf`,
    filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { ok: false }

  try {
    const pdf = await janela.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'custom', top: 0.55, bottom: 0.55, left: 0.5, right: 0.5 },
    })
    await fs.writeFile(filePath, pdf)
    shell.showItemInFolder(filePath)
    return { ok: true, caminho: filePath }
  } catch (erro) {
    dialog.showErrorBox('Nao foi possivel gerar o PDF', String(erro.message ?? erro))
    return { ok: false }
  }
})

// -------------------------------------------------------------------- window

function construirMenu() {
  const template = [
    {
      label: 'Ficheiro',
      submenu: [
        {
          label: 'Novo projeto',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            ficheiroAtual = null
            janela.setTitle(tituloJanela())
            janela.webContents.send('projeto:novo')
          },
        },
        { type: 'separator' },
        { label: 'Abrir...', accelerator: 'CmdOrCtrl+O', click: abrirProjeto },
        { label: 'Guardar', accelerator: 'CmdOrCtrl+S', click: () => pedirGuardar(false) },
        { label: 'Guardar como...', accelerator: 'CmdOrCtrl+Shift+S', click: () => pedirGuardar(true) },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas de programador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamanho normal' },
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Reduzir' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Ecra inteiro' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Licenca...',
          click: () => {
            const d = licencaAtiva
            dialog.showMessageBox(janela, {
              type: 'info',
              message: 'Licenca Maqo',
              detail: d
                ? `Licenciado a: ${d.nome}\nID: ${d.id}\nEmitida: ${d.emitida}\nValidade: ${d.expira ?? 'sem limite'}`
                : 'Sem licenca ativa.',
              buttons: ['Fechar'],
            })
          },
        },
        {
          label: 'Desativar esta instalacao...',
          click: async () => {
            const { response } = await dialog.showMessageBox(janela, {
              type: 'warning',
              buttons: ['Cancelar', 'Desativar'],
              defaultId: 0,
              cancelId: 0,
              message: 'Desativar esta instalacao?',
              detail: 'A aplicacao fecha e volta a pedir a chave no proximo arranque.',
            })
            if (response !== 1) return
            removerLicenca(app.getPath('userData'))
            app.relaunch()
            app.exit(0)
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#070b14',
    show: false,
    title: tituloJanela(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  construirMenu()
  janela.once('ready-to-show', () => janela.show())

  // the page's own <title> would otherwise overwrite the open file name
  janela.on('page-title-updated', (evento) => {
    evento.preventDefault()
    janela.setTitle(tituloJanela())
  })

  if (ehDev) {
    janela.loadURL(DEV_URL)
  } else {
    janela.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // external links open in the real browser, never inside the app shell
  janela.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  janela.on('closed', () => {
    janela = null
  })
}

app.whenReady().then(() => {
  licencaAtiva = licencaGuardada(app.getPath('userData'))
  if (licencaAtiva) criarJanela()
  else abrirJanelaAtivacao()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (licencaAtiva) criarJanela()
      else abrirJanelaAtivacao()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
