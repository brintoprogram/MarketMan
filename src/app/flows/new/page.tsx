import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { createClient } from '@/lib/supabase/server';
import { FlowEditor } from '@/components/flow-editor';

export const dynamic = 'force-dynamic';

export default async function NewFlowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: assets }, { data: recipients }, { data: reports }] = await Promise.all([
    supabase.from('assets').select('id, symbol, name, unit').eq('active', true).order('display_order'),
    supabase.from('recipients').select('id, name, is_self').eq('user_id', user.id).eq('verified', true).order('is_self', { ascending: false }),
    supabase.from('scheduled_reports').select('id, name').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  return (
    <div className="min-h-screen bg-bg">
      <AppNav />
      <FlowEditor
        assets={assets ?? []}
        recipients={recipients ?? []}
        reports={reports ?? []}
      />
    </div>
  );
}
