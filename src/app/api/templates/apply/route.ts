import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/templates';

export async function POST(request: Request) {
  const supa = createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { template_id } = await request.json();
  const template = getTemplate(String(template_id));
  if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });

  // resolve symbols → asset_ids
  const allSymbols = Array.from(new Set([
    ...template.alerts.map((a) => a.asset_symbol),
    ...template.reports.flatMap((r) => r.asset_symbols)
  ]));
  const { data: assets } = await supa.from('assets').select('id, symbol').eq('active', true).in('symbol', allSymbols);
  const bySymbol = new Map((assets ?? []).map((a) => [a.symbol, a.id]));

  let alertsCreated = 0;
  let reportsCreated = 0;
  const missingSymbols: string[] = [];

  // alertas
  const alertRows = template.alerts
    .map((a) => {
      const assetId = bySymbol.get(a.asset_symbol);
      if (!assetId) { missingSymbols.push(a.asset_symbol); return null; }
      return {
        user_id: user.id,
        asset_id: assetId,
        alert_type: a.alert_type,
        threshold_pct: a.threshold_pct ?? 1,
        comparison_type: a.comparison_type ?? 'last_message',
        comparison_days: a.comparison_days ?? null,
        message_template: a.message_template ?? null,
        active: true,
        recipient_ids: []
      };
    })
    .filter(Boolean) as any[];

  if (alertRows.length) {
    const { data: ins, error } = await supa.from('alerts').insert(alertRows).select('id');
    if (error) return NextResponse.json({ error: `Falha ao criar alertas: ${error.message}` }, { status: 500 });
    alertsCreated = ins?.length ?? 0;
  }

  // relatórios
  for (const r of template.reports) {
    const assetIds = r.asset_symbols
      .map((s) => bySymbol.get(s))
      .filter(Boolean) as string[];
    if (assetIds.length === 0) continue;
    const { error } = await supa.from('scheduled_reports').insert({
      user_id: user.id,
      name: r.name,
      cron_expression: r.cron_expression,
      asset_ids: assetIds,
      variations: r.variations,
      include_volume: r.include_volume,
      include_spread: r.include_spread,
      active: true,
      recipient_ids: []
    });
    if (!error) reportsCreated += 1;
  }

  return NextResponse.json({
    ok: true,
    template_id: template.id,
    alerts_created: alertsCreated,
    reports_created: reportsCreated,
    missing_symbols: missingSymbols
  });
}
