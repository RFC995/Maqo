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

**Revogacao remota:** a app confirma a licenca contra um servidor (Supabase) no
arranque e depois a cada 6h enquanto esta aberta — ver secao seguinte.

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

### Revogar uma licenca (cortar o acesso a alguem)

Cada chave emitida fica tambem registada numa tabela `licencas` num projeto
Supabase. A app pergunta a essa tabela (atraves de uma Edge Function,
`verificar-licenca`) se a sua chave continua ativa:

- No arranque, e a cada 6h enquanto a app esta aberta.
- Se a resposta for "revogada", a app mostra o aviso e fecha — mesmo a meio
  de uma sessao.
- Sem internet, a app continua a funcionar ate 7 dias desde a ultima
  confirmacao boa; passado isso, bloqueia ate voltar a haver ligacao.

**Para revogar:** abre o [dashboard do projeto Supabase](https://supabase.com/dashboard) →
**Table Editor** → tabela `licencas` → encontra a linha pelo `id` ou `nome` →
muda `revogada` para `true`. Na proxima verificacao (arranque ou dentro de 6h,
o que vier primeiro) o colega perde o acesso. Para reverter, volta a por
`false`.

A coluna `ultima_verificacao` mostra a ultima vez que essa instalacao
confirmou a licenca, e `device_id` identifica a maquina que a ativou primeiro
— util para perceber se uma chave esta a ser partilhada entre varias maquinas
(o `device_id` so muda se a app for reinstalada a apagar o `device-id.txt`
guardado nos dados do utilizador).

### Configurar o servidor de revogacao (uma vez)

1. Cria um projeto em [supabase.com](https://supabase.com) (plano free chega).
2. Aplica a migracao e publica a funcao (com o [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```
   npx supabase login
   npx supabase link --project-ref <ref-do-teu-projeto>
   npx supabase db push
   npx supabase functions deploy verificar-licenca
   ```
3. Preenche `electron/supabase-config.cjs` com o `Project URL` e a `anon public
   key` (Project Settings → API). Estes dois valores vao dentro da app —
   sao publicos por definicao, o RLS da tabela e que impede acesso direto.
4. Cria um `.env` na raiz (a partir de `.env.example`) com `SUPABASE_URL` e a
   `service_role key` — **nunca** a `anon key` para isto, e **nunca** comitar
   este ficheiro. E usado so por `npm run licenca` para registar cada chave
   emitida na tabela.

Sem isto configurado, a app funciona exatamente como antes (so verificacao
local) — o pedido remoto falha em silencio e cai na tolerancia offline.

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

