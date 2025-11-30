import dotenv from 'dotenv'
dotenv.config()
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL 
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseRoleKey = process.env.SUPABASE_ROLE_KEY  
export const supabase = createClient(supabaseUrl, supabaseRoleKey)