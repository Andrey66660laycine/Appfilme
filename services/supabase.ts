
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://krounsrppyyxmkkuzjks.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZTagE8jIYeeLhXzOQo-LHA_haBJ9PQH'; // Sua chave pública

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
