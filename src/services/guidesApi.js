import { supabase } from './supabaseClient';
export async function fetchGuides(userId) {
  const { data, error } = await supabase
    .from('vault_guides')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createGuide(userId, guide) {
  const { data, error } = await supabase
    .from('vault_guides')
    .insert([{ user_id: userId, ...guide }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGuideMessages(id, messages) {
  const { error } = await supabase.from('vault_guides').update({ messages }).eq('id', id);
  if (error) throw error;
}

export async function deleteGuide(id) {
  const { error } = await supabase.from('vault_guides').delete().eq('id', id);
  if (error) throw error;
}
