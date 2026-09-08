import { createClient } from '@supabase/supabase-js'

// Insira suas credenciais reais do Supabase diretamente aqui abaixo:
const supabaseUrl = 'https://lpqdqkoaxpxrvxzvnxap.supabase.co'
const supabaseAnonKey = 'sb_publishable_vI9CyT_4nfyMl6GkuM3xrg_nHTRpMP8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos auxiliares para o FamíliaRastro
export type Circle = {
  id: string
  name: string
  code: string
}

export type Member = {
  id: string
  circle_id: string
  name: string
  avatar: string
  avatar_color?: string
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  battery: number
  status: 'online' | 'offline' | 'moving'
  last_seen: string
  sos_active?: boolean
  sos_triggered_at?: string | null
  is_you: boolean
}