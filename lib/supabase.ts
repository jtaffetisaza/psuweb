import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eyeygfljfmmmxeiiwote.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZXlnZmxqZm1tbXhlaWl3b3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTQwOTUsImV4cCI6MjEwMjUzMDA5NX0.QOMWgHKcJdFcPKGl5U5HGr2okf6nzklXNNr6PfA2o8U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export interface StaffMember {
  id: number;
  name: string;
  title: string;
}

export async function fetchStaff() {
  const { data, error } = await supabase
    .from('football_staff')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  return data as StaffMember[];
}