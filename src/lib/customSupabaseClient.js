import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dopgudlgtnzgdrlildlm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcGd1ZGxndG56Z2RybGlsZGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MjUyNTAsImV4cCI6MjA3NTEwMTI1MH0.viiin1a_fPe1E_tktsVSU6DO5ujX-2KOhkj0yKWDfaQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);