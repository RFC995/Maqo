# Maqo — app Windows e licenciamento

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | app no browser (desenvolvimento web) |
| `npm run app` | app na janela Electron, com hot reload |
| `npm run app:dir` | empacota so a pasta descompactada (rapido, para testar) |
| `npm run app:build` | gera o instalador `.exe` e o portable |
| `npm run licenca:iniciar` | cria o par de chaves de assinatura (**uma unica vez**) |
| `npm run licenca -- --nome "Cliente"` | emite uma chave para um cliente |

Os ficheiros empacotados vao para `%LOCALAPPDATA%\maqo-build`:

- `Maqo-<versao>-x64.exe` — instalador NSIS, e este que envias
- `Maqo-<versao>-portable.exe` — corre sem instalar
- `win-unpacked\Maqo.exe` — versao solta, util para testes

> **Porque nao e dentro do projeto:** no Windows as pastas especiais (Desktop,
> Documentos) tem o atributo ReadOnly, e o passo final do electron-builder
> (`rename win-unpacked.tmp -> win-unpacked`) falha com `EPERM` por baixo delas.
> Compilar para `%LOCALAPPDATA%` evita isso. Para escolher outro sitio:
> `npm run app:build -- --saida "D:/onde/quiseres"`.

---

## Licenciamento

### Como funciona

Cada chave e um bloco de texto assinado com **Ed25519**. A app leva so a metade
**publica** da chave e por isso consegue verificar licencas mas nunca emiti-las.
A verificacao corre no processo principal do Electron, antes de a janela da
aplicacao sequer abrir.

### O que isto garante — e o que nao garante

**Garante:** ninguem consegue forjar uma chave, inventar uma, alterar o nome do
cliente nem esticar a validade. Tudo isso quebra a assinatura e e recusado.
Testado contra os dois casos que interessam:

- payload adulterado (nome trocado) → recusado
- validade alterada a mao para 2099 → recusado

**Nao garante:** que alguem com conhecimentos tecnicos nao remova a verificacao.
O `app.asar` abre-se com um comando e o codigo le-se. Isto e verdade em
**qualquer** sistema de licencas que corra na maquina do cliente, nao e uma
falha desta implementacao. O objetivo realista e impedir chaves inventadas e
partilha casual, e isso esta cumprido.

Se um dia precisares de **revogar** uma licenca ja entregue, ai sim e preciso um
servidor de ativacao online — a app passaria a confirmar periodicamente se a
chave continua valida. Da para acrescentar por cima do que ja existe.

### Arranque (fazer uma vez)

```
npm run licenca:iniciar
```

Cria:

- `chave-privada.pem` na raiz — **guarda isto em local seguro e faz copia**
- `electron/chave-publica.cjs` — vai dentro da app

> Se perderes a chave privada, nunca mais consegues emitir chaves que as
> instalacoes existentes aceitem. Se vazar, qualquer pessoa pode emitir chaves
> validas. Ambos os ficheiros de risco (`chave-privada.pem` e
> `licencas-emitidas.log`) estao no `.gitignore` e ficam de fora do instalador.

### Emitir uma chave

```
npm run licenca -- --nome "Camara de Aveiro" --expira 2027-12-31
npm run licenca -- --nome "Cliente Piloto" --expira 2026-12-31 --notas "piloto"
npm run licenca -- --nome "Uso interno"
```

Sem `--expira` a licenca nao caduca. Cada emissao fica registada em
`licencas-emitidas.log` para saberes o que entregaste a quem.

### Do lado do cliente

1. Instala o `Maqo-<versao>-x64.exe`.
2. No primeiro arranque aparece o ecra de ativacao.
3. Cola o bloco da chave e carrega em **Ativar**.
4. Fica guardada na maquina; nos arranques seguintes entra direto.

Em **Ajuda → Licenca** ve-se a quem esta licenciada e ate quando.
**Ajuda → Desativar esta instalacao** limpa a chave e volta a pedi-la.

---

## Ficheiros de projeto

Na app desktop os projetos sao ficheiros `.json` a serio, com dialogos nativos:

- **Ficheiro → Novo** (`Ctrl+N`)
- **Ficheiro → Abrir...** (`Ctrl+O`)
- **Ficheiro → Guardar** (`Ctrl+S`) — grava por cima do ficheiro aberto
- **Ficheiro → Guardar como...** (`Ctrl+Shift+S`)

O nome do ficheiro aberto aparece na barra de titulo e na barra superior. O
autosave em `localStorage` continua a funcionar como rede de seguranca.

No browser, os mesmos botoes continuam a fazer download/upload — o mesmo build
serve os dois modos.

---

## Notas de manutencao

- **Versao:** o `version` do `package.json` esta a `0.0.0` e vai para o nome dos
  ficheiros. Sobe-o antes de distribuir (ex.: `1.0.0`).
- **Instalador nao assinado:** o SmartScreen do Windows vai avisar na primeira
  execucao ("Editor desconhecido"). Para eliminar isso e preciso um certificado
  de assinatura de codigo (Authenticode), que se compra a uma CA. Sem ele, os
  colegas tem de clicar em "Mais informacoes → Executar mesmo assim".
- **`npm install` num PC novo:** este npm bloqueia scripts de instalacao, por
  isso o binario do Electron pode nao ser descarregado. Se `npm run app` se
  queixar, corre `node node_modules/electron/install.js`.
- **VS Code:** o terminal integrado pode exportar `ELECTRON_RUN_AS_NODE=1`, o
  que faz o Electron arrancar como Node puro sem APIs de janela. Os scripts
  `app` e `app:build` ja limpam essa variavel.

