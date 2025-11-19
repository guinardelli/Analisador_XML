// Importar tipos do módulo padrão do Deno
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

interface PieceData {
  name: string
  group: string
  quantity: number
  section: string
  length: number
  weight: number
  unit_volume: number
  concrete_class: string
  piece_ids: string[]
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Obter o corpo da requisição
    const { p_project_id, p_user_id, p_pieces } = await req.json()
    
    // Validar parâmetros
    if (!p_project_id || !p_user_id || !p_pieces) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Conectar ao banco de dados
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar se o usuário é o dono do projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', p_project_id)
      .eq('user_id', p_user_id)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Variável para acumular o volume total
    let new_total_volume = 0

    // Iterar sobre as novas peças
    for (const piece_data of p_pieces) {
      // Normalizar as chaves do JSON para minúsculas para garantir consistência
      const normalized_piece_data: Record<string, any> = {}
      for (const [key, value] of Object.entries(piece_data)) {
        normalized_piece_data[key.toLowerCase()] = value
      }

      // Extrair valores normalizados
      const name = normalized_piece_data.name || normalized_piece_data.nome
      const group = normalized_piece_data.group || normalized_piece_data.grupo
      const quantity = parseInt(normalized_piece_data.quantity || normalized_piece_data.quantidade) || 0
      const section = normalized_piece_data.section || normalized_piece_data.secao || normalized_piece_data.seção
      const length = parseFloat(normalized_piece_data.length || normalized_piece_data.comprimento) || 0
      const weight = parseFloat(normalized_piece_data.weight || normalized_piece_data.peso) || 0
      const unit_volume = parseFloat(
        normalized_piece_data.unit_volume || 
        normalized_piece_data.volume_unit || 
        normalized_piece_data.volumeunit || 
        normalized_piece_data.volume_unitario
      ) || 0
      const concrete_class = normalized_piece_data.concrete_class || 
                            normalized_piece_data.classe_concreto || 
                            normalized_piece_data.classeconcreto
      const piece_ids = normalized_piece_data.piece_ids || 
                       normalized_piece_data.idspeca || 
                       normalized_piece_data.ids_peca || 
                       []

      // Inserir a peça agrupada (sem excluir as existentes)
      const { error: insertError } = await supabase
        .from('pieces')
        .insert({
          project_id: p_project_id,
          user_id: p_user_id,
          name: name,
          group: group,
          quantity: quantity,
          section: section,
          length: length,
          weight: weight,
          unit_volume: unit_volume,
          concrete_class: concrete_class,
          piece_ids: piece_ids
        })

      if (insertError) {
        console.error('Error inserting piece:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to insert piece: ' + insertError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Acumular o volume para o novo total
      new_total_volume += (unit_volume * quantity)

      // Atualizar ou criar status para cada peça individual
      // Se piece_ids existir, verificar cada ID individualmente
      if (Array.isArray(piece_ids) && piece_ids.length > 0) {
        for (const piece_id of piece_ids) {
          // Verificar se já existe status para esta peça
          const { data: existing_status, error: statusCheckError } = await supabase
            .from('piece_status')
            .select('id')
            .eq('project_id', p_project_id)
            .eq('piece_mark', piece_id)
            .maybeSingle()

          if (statusCheckError) {
            console.error('Error checking piece status:', statusCheckError)
            continue
          }

          // Se não existir, criar um novo status
          if (!existing_status) {
            const { error: statusInsertError } = await supabase
              .from('piece_status')
              .insert({
                project_id: p_project_id,
                user_id: p_user_id,
                piece_mark: piece_id,
                piece_name: name,
                is_released: false
              })

            if (statusInsertError) {
              console.error('Error inserting piece status:', statusInsertError)
            }
          } else {
            // Se existir, atualizar o nome da peça
            const { error: statusUpdateError } = await supabase
              .from('piece_status')
              .update({ piece_name: name })
              .eq('id', existing_status.id)

            if (statusUpdateError) {
              console.error('Error updating piece status:', statusUpdateError)
            }
          }
        }
      }
    }

    // Atualizar o volume total na tabela de projetos
    const { error: updateError } = await supabase
      .from('projects')
      .update({ total_volume: new_total_volume })
      .eq('id', p_project_id)

    if (updateError) {
      console.error('Error updating project total volume:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update project volume: ' + updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({ message: 'Pieces added successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})