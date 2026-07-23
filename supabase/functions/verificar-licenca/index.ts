// Unico ponto de contacto entre a app desktop e o estado remoto das licencas.
// Recebe { id, deviceId }, devolve so { revogada }. Usa a service role
// internamente para poder ler/escrever na tabela apesar do RLS a bloquear
// para a anon key que a app leva embutida.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ erro: 'metodo nao permitido' }), { status: 405 })
  }

  let corpo: { id?: string; deviceId?: string }
  try {
    corpo = await req.json()
  } catch {
    return new Response(JSON.stringify({ erro: 'JSON invalido' }), { status: 400 })
  }

  const id = String(corpo.id ?? '').trim()
  if (!id) {
    return new Response(JSON.stringify({ erro: 'id em falta' }), { status: 400 })
  }
  const deviceId = corpo.deviceId ? String(corpo.deviceId).trim() : null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('licencas')
    .select('revogada, device_id')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return new Response(JSON.stringify({ erro: 'falha ao consultar' }), { status: 500 })
  }

  // Um id que nao existe na tabela (ex.: chave emitida antes deste sistema
  // existir) não é prova de revogação — trata-se como ativa.
  const revogada = data?.revogada ?? false

  await supabase
    .from('licencas')
    .update({
      ultima_verificacao: new Date().toISOString(),
      // so grava o device na primeira vez; se mudar depois é sinal a olhar
      // no painel (chave possivelmente partilhada), não algo a sobrescrever.
      ...(deviceId && !data?.device_id ? { device_id: deviceId } : {}),
    })
    .eq('id', id)

  return new Response(JSON.stringify({ revogada }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
