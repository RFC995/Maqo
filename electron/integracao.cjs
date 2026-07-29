const mqtt = require('mqtt')

/**
 * MQTT bridge to TTN / ChirpStack, in the main process.
 *
 * The renderer cannot open a raw TLS MQTT socket, so the connection lives here:
 * we subscribe to the network server's uplink topic and forward every message
 * (and every connection-state change) to the renderer, which decodes it. Only
 * one connection is active at a time.
 */

let cliente = null
let estado = { estado: 'desligado' }

function enviar(obterJanela, canal, dados) {
  const janela = obterJanela()
  if (janela && !janela.isDestroyed()) janela.webContents.send(canal, dados)
}

function definirEstado(obterJanela, novo) {
  estado = novo
  enviar(obterJanela, 'integracao:estado', novo)
}

function fechar() {
  if (cliente) {
    try {
      cliente.end(true)
    } catch {
      // already gone
    }
    cliente = null
  }
}

/** Broker URL + client options + subscription topic for the chosen provider. */
function montarLigacao(config) {
  if (config.provedor === 'ttn') {
    const { host, appId, tenant, apiKey } = config.ttn
    const username = `${appId}@${tenant}`
    return {
      url: `mqtts://${host}:8883`,
      opcoes: { username, password: apiKey, protocolVersion: 4, rejectUnauthorized: true },
      topico: `v3/${username}/devices/+/up`,
    }
  }
  const { host, porta, tls, appId, utilizador, password } = config.chirpstack
  const protocolo = tls ? 'mqtts' : 'mqtt'
  return {
    url: `${protocolo}://${host}:${porta}`,
    opcoes: {
      username: utilizador || undefined,
      password: password || undefined,
      rejectUnauthorized: tls,
    },
    // v4 topic; the "+" for application id subscribes to all when none is given
    topico: `application/${appId || '+'}/device/+/event/up`,
  }
}

function mensagemErro(erro) {
  const texto = String((erro && (erro.message || erro.code)) || erro || 'erro desconhecido')
  if (/not authorized|bad user|bad username|password/i.test(texto)) {
    return 'Credenciais recusadas — confirma o Application ID e a API key.'
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(texto)) return 'Servidor nao encontrado — confirma o host.'
  if (/ECONNREFUSED/i.test(texto)) return 'Ligacao recusada — confirma o host, a porta e o TLS.'
  if (/certificate|self.signed|SSL/i.test(texto)) return 'Certificado TLS rejeitado.'
  return texto
}

function ligar(obterJanela, config) {
  return new Promise((resolve) => {
    fechar()
    let liga
    try {
      liga = montarLigacao(config)
    } catch (erro) {
      definirEstado(obterJanela, { estado: 'erro', provedor: config.provedor, mensagem: mensagemErro(erro) })
      resolve({ ok: false, motivo: mensagemErro(erro) })
      return
    }

    definirEstado(obterJanela, { estado: 'a-ligar', provedor: config.provedor })

    let resolvido = false
    let ligadoAlgumaVez = false
    const terminar = (resultado) => {
      if (resolvido) return
      resolvido = true
      clearTimeout(cronometro)
      resolve(resultado)
    }

    const cronometro = setTimeout(() => {
      if (!ligadoAlgumaVez) {
        fechar()
        definirEstado(obterJanela, {
          estado: 'erro',
          provedor: config.provedor,
          mensagem: 'Tempo esgotado a ligar ao servidor.',
        })
        terminar({ ok: false, motivo: 'Tempo esgotado a ligar ao servidor.' })
      }
    }, 15000)

    const c = mqtt.connect(liga.url, {
      ...liga.opcoes,
      keepalive: 60,
      connectTimeout: 15000,
      reconnectPeriod: 5000,
      clean: true,
    })
    cliente = c

    c.on('connect', () => {
      ligadoAlgumaVez = true
      c.subscribe(liga.topico, { qos: 0 }, (erro) => {
        if (erro) {
          definirEstado(obterJanela, {
            estado: 'erro',
            provedor: config.provedor,
            mensagem: `Ligado, mas falhou a subscricao: ${mensagemErro(erro)}`,
          })
          return
        }
        definirEstado(obterJanela, { estado: 'ligado', provedor: config.provedor })
      })
      terminar({ ok: true })
    })

    c.on('message', (topico, payload) => {
      enviar(obterJanela, 'integracao:uplink', {
        provedor: config.provedor,
        topico,
        mensagem: payload.toString('utf8'),
      })
    })

    c.on('error', (erro) => {
      const mensagem = mensagemErro(erro)
      definirEstado(obterJanela, { estado: 'erro', provedor: config.provedor, mensagem })
      // a first-attempt failure (usually bad credentials) should not retry-loop
      if (!ligadoAlgumaVez) {
        fechar()
        terminar({ ok: false, motivo: mensagem })
      }
    })

    c.on('close', () => {
      if (ligadoAlgumaVez && cliente === c) {
        definirEstado(obterJanela, {
          estado: 'a-ligar',
          provedor: config.provedor,
          mensagem: 'Ligacao perdida — a reconectar...',
        })
      }
    })
  })
}

function desligar(obterJanela) {
  fechar()
  definirEstado(obterJanela, { estado: 'desligado' })
  return { ok: true }
}

/** Wires the IPC handlers. Called once from main.cjs with a live-window getter. */
function registarIpcIntegracao(ipcMain, obterJanela) {
  ipcMain.handle('integracao:ligar', (_evento, config) => ligar(obterJanela, config))
  ipcMain.handle('integracao:desligar', () => desligar(obterJanela))
  ipcMain.handle('integracao:estado', () => estado)
}

module.exports = { registarIpcIntegracao }
