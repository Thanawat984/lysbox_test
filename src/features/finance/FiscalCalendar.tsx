import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type TaskType = "DAS" | "DCTF" | "FGTS" | "IRPJ" | "NF" | "RECIBO" | "FOLHA";
type NotifyType = "painel" | "email" | "whatsapp";

type EventRow = {
	id?: string;
	company_id: string;
	accountant_id?: string | null;
	obligation_id?: string | null;
	// type derived from obligation_id
	due_date: string; // yyyy-mm-dd
	status?: string; // previsto | pago | atrasado | arquivado
	channel?: NotifyType | null;
	template_code?: string | null;
	referencia?: string | null;
};

function formatDateYYYYMMDD(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function dayKey(d: Date): string {
	const date = d instanceof Date ? d : new Date(d as any);
	if (isNaN(date.getTime())) {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	}
	return date.toISOString().slice(0, 10);
}

const TaskMeta: Record<TaskType, { label: string; short: string; dot: string }> = {
	DAS: { label: "DAS", short: "D", dot: "bg-red-600" },
	DCTF: { label: "DCTF", short: "DC", dot: "bg-sky-400" },
	FGTS: { label: "FGTS", short: "FG", dot: "bg-emerald-400" },
	IRPJ: { label: "IRPJ", short: "IR", dot: "bg-yellow-400" },
	NF: { label: "NF", short: "NF", dot: "bg-indigo-400" },
	RECIBO: { label: "RECIBO", short: "RB", dot: "bg-pink-400" },
	FOLHA: { label: "FOLHA", short: "FL", dot: "bg-gray-400" },
};

function TaskDot({ t }: { t: TaskType }) {
	return <span className={`inline-block h-2 w-2 rounded-full ${TaskMeta[t].dot}`} title={TaskMeta[t].label} />;
}

function TaskChip({ t }: { t: TaskType }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0.5">
			<span className={`inline-block h-2 w-2 rounded-full ${TaskMeta[t].dot}`} />
			<span>{TaskMeta[t].label}</span>
		</span>
	);
}
const NotifyEmoji: Record<NotifyType, string> = {
	painel: "📌",
	email: "✉️",
	whatsapp: "🟢",
};

function seedByRegime(regime: string, monthDate: Date): Record<string, TaskType[]> {
	const y = monthDate.getFullYear();
	const m = monthDate.getMonth();
	const mk = (day: number) => new Date(y, m, day);
	const map: Record<string, TaskType[]> = {};
	const put = (d: Date, t: TaskType) => {
		const k = dayKey(d);
		map[k] = map[k] ? [...new Set([...map[k], t])] : [t];
	};
	// Common approximations
	put(mk(7), "FGTS");
	put(mk(15), "DCTF");
	if (regime.includes("mei")) put(mk(20), "DAS");
	else if (regime.includes("simples")) put(mk(20), "DAS");
	else put(mk(20), "IRPJ");
	return map;
}

function normalizeTaskType(value: string): TaskType {
	const v = String(value || "").toUpperCase();
	const allowed: TaskType[] = ["DAS", "DCTF", "FGTS", "IRPJ", "NF", "RECIBO", "FOLHA"];
	return (allowed as string[]).includes(v) ? (v as TaskType) : "DAS";
}

export default function FiscalCalendar({ companyId, ownerUserId, regime }: { companyId: string; ownerUserId: string; regime: string }) {
	const [selected, setSelected] = React.useState<Date | undefined>(new Date());
	const [eventsByDay, setEventsByDay] = React.useState<Record<string, EventRow[]>>({});
	const [editing, setEditing] = React.useState<{
		date: string;
		selectedOblIds: string[];
		channel: NotifyType;
		templateCode: string;
	} | null>(null);
	const [accountantId, setAccountantId] = React.useState<string | null>(null);
	const [oblOptions, setOblOptions] = React.useState<Array<{ id: string; type: TaskType; title: string; regra_vencimento: any }>>([]);
	const [settingsOpen, setSettingsOpen] = React.useState(false);
	const [settingsSelectedIds, setSettingsSelectedIds] = React.useState<string[]>([]);
	const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

	const monthAnchor = calendarMonth;
	const optionsById = React.useMemo(() => Object.fromEntries(oblOptions.map(o => [o.id, o])), [oblOptions]);
	const usedOblIdsThisMonth = React.useMemo(() => {
		const used = new Set<string>();
		Object.entries(eventsByDay).forEach(([k, rows]) => {
			const d = new Date(k);
			if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
				rows.forEach((r) => { if (r.obligation_id) used.add(r.obligation_id); });
			}
		});
		return used;
	}, [eventsByDay, monthAnchor]);
	const usedTiposThisMonth = React.useMemo(() => {
		const used = new Set<TaskType>();
		Object.entries(eventsByDay).forEach(([k, rows]) => {
			const d = new Date(k);
			if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
				rows.forEach((r) => { const t = r.obligation_id ? optionsById[r.obligation_id]?.type : null; if (t) used.add(t); });
			}
		});
		return used;
	}, [eventsByDay, monthAnchor, optionsById]);

	const usedTiposThisMonthExcludingEditingDay = React.useMemo(() => {
		const used = new Set<TaskType>();
		Object.entries(eventsByDay).forEach(([k, rows]) => {
			if (editing && k === editing.date) return;
			const d = new Date(k);
			if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
				rows.forEach((r) => { const t = r.obligation_id ? optionsById[r.obligation_id]?.type : null; if (t) used.add(t); });
			}
		});
		return used;
	}, [eventsByDay, monthAnchor, optionsById, editing?.date]);

	// Load current accountant id
	React.useEffect(() => {
		(async () => {
			try {
				const { data } = await supabase.from("accountants").select("id").maybeSingle();
				setAccountantId((data as any)?.id ?? null);
			} catch { setAccountantId(null); }
		})();
	}, []);

	// Load obligations by regime (schema: id, regime, tipo, regra_vencimento, ativo)
	React.useEffect(() => {
		(async () => {
			try {
				const { data, error } = await supabase
					.from("tax_obligations")
					.select("id, tipo, regra_vencimento, regime, ativo")
					.eq("ativo", true);
				if (error) throw error;
				const mapped = (data || []).map((r: any) => ({
					id: String(r.id),
					type: normalizeTaskType(String(r.tipo || "")),
					title: String(r.regime || ""),
					regra_vencimento: r.regra_vencimento,
				}));
				setOblOptions(mapped);
			} catch { setOblOptions([]); }
		})();
	}, [regime]);

	React.useEffect(() => {
		(async () => {
			try {
				const start = new Date(monthAnchor);
				const end = new Date(monthAnchor);
				end.setMonth(end.getMonth() + 1);
				// Load dynamic events if table exists
				const byDay: Record<string, EventRow[]> = {};
				let loaded = false;
				try {
					const { data, error } = await supabase
						.from("calendar_events")
						.select("id, company_id, accountant_id, obligation_id, due_date, status, channel, template_code, referencia")
						.eq("company_id", companyId)
						.gte("due_date", start.toISOString().slice(0, 10))
						.lt("due_date", end.toISOString().slice(0, 10));
					if (!error && Array.isArray(data)) {
						data.forEach((row: any) => {
							const key = row.due_date;
							const ev: EventRow = {
								id: row.id,
								company_id: row.company_id,
								accountant_id: row.accountant_id ?? null,
								obligation_id: row.obligation_id ?? null,
								due_date: row.due_date,
								status: row.status,
								channel: row.channel ?? null,
								template_code: row.template_code ?? null,
								referencia: row.referencia ?? null,
							};
							byDay[key] = byDay[key] ? [...byDay[key], ev] : [ev];
						});
						loaded = true;
					}
				} catch { }

				if (!loaded) {
					// Seed from obligations if available; fallback to regime approximations
					if (oblOptions.length) {
						oblOptions.forEach((o) => {
							const due = deriveDueDate(o.regra_vencimento, monthAnchor);
							const key = dayKey(due);
							const ev: EventRow = {
								company_id: companyId,
								accountant_id: accountantId,
								obligation_id: o.id,
								due_date: key,
								status: "previsto",
								channel: null,
								template_code: null,
								referencia: JSON.stringify(o.regra_vencimento),
							};
							byDay[key] = byDay[key] ? [...byDay[key], ev] : [ev];
						});
					} else {
						const seed = seedByRegime(String(regime || "").toLowerCase(), monthAnchor);
						Object.entries(seed).forEach(([k, types]) => {
							byDay[k] = types.map(() => ({ company_id: companyId, accountant_id: accountantId, obligation_id: null, due_date: k, status: "previsto", channel: null, template_code: null, referencia: null } as EventRow));
						});
					}
				}
				setEventsByDay(byDay);
			} catch {
				setEventsByDay({});
			}
		})();
	}, [companyId, ownerUserId, regime, monthAnchor, oblOptions, accountantId]);

	function deriveDueDate(rule: any, monthDate: Date): Date {
		try {
			const year = monthDate.getFullYear();
			const month = monthDate.getMonth();
			if (!rule) return new Date(year, month, 20);
			if (typeof rule === 'string') {
				const parsed = new Date(rule);
				if (!isNaN(parsed.getTime())) return parsed;
			}
			const raw = (rule?.due_day ?? rule?.dia ?? rule?.day ?? rule?.day_of_month);
			let due = Number(raw);
			if (!Number.isFinite(due) || due <= 0) due = 20;
			const day = Math.max(1, Math.min(28, due));
			const result = new Date(year, month, day);
			if (isNaN(result.getTime())) return new Date(year, month, 20);
			return result;
		} catch { return new Date(monthDate.getFullYear(), monthDate.getMonth(), 20); }
	}

	function openEditor(date: Date) {
		const k = dayKey(date);
		const list = eventsByDay[k] || [];
		const selectedOblIds = list.map(e => String(e.obligation_id || "")).filter(Boolean);
		const any = list[0];
		setEditing({ date: k, selectedOblIds, channel: (any?.channel as any) || 'painel', templateCode: any?.template_code || '' });
	}

	function getTypeFromObligationId(obligationId?: string | null): TaskType | null {
		if (!obligationId) return null;
		const rule = oblOptions.find(o => o.id === obligationId);
		return rule ? rule.type : null;
	}

	async function saveEditor() {
		if (!editing) return;
		const k = editing.date;
		// Replace events for this date with selected obligation rows
		try {
			await supabase.from('calendar_events').delete().eq('company_id', companyId).eq('due_date', k);
			const upserts = editing.selectedOblIds.map((id) => {
				const rule = oblOptions.find(o => o.id === id);
				const dueDateStr = k; // use selected date directly
				return {
					company_id: companyId,
					accountant_id: accountantId,
					obligation_id: id,
					due_date: dueDateStr,
					status: 'previsto',
					channel: editing.channel,
					template_code: editing.templateCode || '',
					referencia: rule ? JSON.stringify(rule.regra_vencimento) : null,
				} as any;
			});
			if (upserts.length) {
				try { await supabase.from('calendar_events').insert(upserts); } catch {}
			}
			setEventsByDay((prev) => ({
				...prev,
				[k]: upserts as any,
			}));
		} finally {
			setEditing(null);
		}
	}

	async function archiveDay() {
		if (!editing) return;
		const k = editing.date;
		try {
			try {
				await supabase
					.from("calendar_events")
					.update({ status: "previsto" })
					.eq("company_id", companyId)
					.eq("due_date", k);
			} catch { }
			setEventsByDay((prev) => ({ ...prev, [k]: [] }));
		} finally {
			setEditing(null);
		}
	}

	function openSettings() {
		const inMonth = new Set<string>();
		Object.entries(eventsByDay).forEach(([k, rows]) => {
			const d = new Date(k);
			if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
				rows.forEach((r) => { if (r.obligation_id) inMonth.add(r.obligation_id); });
			}
		});
		const pre = oblOptions.map(o => o.id).filter(id => inMonth.has(id));
		setSettingsSelectedIds(pre);
		setSettingsOpen(true);
	}

	async function applyRegimeSettings() {
		const ids = settingsSelectedIds;
		const start = new Date(monthAnchor);
		const end = new Date(monthAnchor);
		end.setMonth(end.getMonth() + 1);
		const startIso = start.toISOString().slice(0, 10);
		const endIso = end.toISOString().slice(0, 10);
		try {
			if (ids.length) {
				try {
					await supabase
						.from('calendar_events')
						.delete()
						.eq('company_id', companyId)
						.in('obligation_id', ids)
						.gte('due_date', startIso)
						.lt('due_date', endIso);
				} catch {}
				const rows = ids.map((id) => {
					const rule = oblOptions.find(o => o.id === id);
					const due = deriveDueDate(rule?.regra_vencimento, monthAnchor);
					const dueDateStr = formatDateYYYYMMDD(due);
					return {
						company_id: companyId,
						accountant_id: accountantId,
						obligation_id: id,
						due_date: dueDateStr,
						status: 'previsto',
						channel: 'painel',
						template_code: '',
						referencia: rule ? JSON.stringify(rule.regra_vencimento) : null,
					} as any;
				});
				if (rows.length) {
					try { await supabase.from('calendar_events').insert(rows); } catch {}
				}
				setEventsByDay((prev) => {
					const next: Record<string, EventRow[]> = { ...prev };
					// Remove old selected obligation events in month
					Object.keys(next).forEach((k) => {
						const d = new Date(k);
						if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
							next[k] = (next[k] || []).filter((r) => !r.obligation_id || !ids.includes(r.obligation_id));
							if (next[k].length === 0) delete next[k];
						}
					});
					// Add new ones
					rows.forEach((r: any) => {
						const k = r.due_date as string;
						const ev: EventRow = {
							id: undefined,
							company_id: r.company_id,
							accountant_id: r.accountant_id,
							obligation_id: r.obligation_id,
							due_date: r.due_date,
							status: r.status,
							channel: r.channel,
							template_code: r.template_code,
							referencia: r.referencia,
						};
						next[k] = next[k] ? [...next[k], ev] : [ev];
					});
					return next;
				});
			}
		} finally {
			setSettingsOpen(false);
		}
	}

	const DayContent = React.useCallback((props: any) => {
		const d: Date = props.date;
		const key = dayKey(d);
		const rows = eventsByDay[key] || [];
		const uniqTypes: TaskType[] = [...new Set(rows.map(r => getTypeFromObligationId(r.obligation_id)).filter(Boolean))] as TaskType[];
		const uniqChannels: NotifyType[] = [...new Set(rows.map(r => r.channel).filter(Boolean))] as NotifyType[];
		return (
			<div className="w-full h-full flex flex-col items-center justify-center text-center" onClick={() => openEditor(d)}>
				<div className="leading-none">{d.getDate()}</div>
				{rows.length > 0 && (
					<div className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
						{uniqTypes.map((t) => (
							<TaskDot key={t} t={t} />
						))}
					</div>
				)}
				{uniqChannels.length > 0 && (
					<div className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
						{uniqChannels.map((c) => (
							<span key={c}>{NotifyEmoji[c]}</span>
						))}
					</div>
				)}
			</div>
		);
	}, [eventsByDay, oblOptions]);

	async function saveMonthToDb() {
		try {
			const start = new Date(monthAnchor);
			const end = new Date(monthAnchor); end.setMonth(end.getMonth() + 1);
			const startIso = start.toISOString().slice(0, 10);
			const endIso = end.toISOString().slice(0, 10);
			try {
				await supabase
					.from('calendar_events')
					.delete()
					.eq('company_id', companyId)
					.gte('due_date', startIso)
					.lt('due_date', endIso);
			} catch {}
			const rows: any[] = [];
			const seenTipos = new Set<TaskType>();
			Object.entries(eventsByDay).forEach(([k, list]) => {
				const d = new Date(k);
				if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
					(list || []).forEach((r) => {
						const t = r.obligation_id ? optionsById[r.obligation_id]?.type : null;
						if (t && seenTipos.has(t)) return;
						if (t) seenTipos.add(t as TaskType);
						rows.push({
							company_id: companyId,
							accountant_id: accountantId,
							obligation_id: r.obligation_id ?? null,
							due_date: k,
							status: r.status || 'previsto',
							channel: r.channel || 'painel',
							template_code: r.template_code || '',
							referencia: r.referencia ?? null,
						});
					});
				}
			});
			if (rows.length) {
				await supabase.from('calendar_events').insert(rows);
			}
		} catch {}
	}

	return (
		<div>
			<div className="flex justify-end gap-2 py-4">
				<Button size="sm" onClick={openSettings} className=" bg-white/10 text-white border border-white/20 hover:bg-white/15 h-8 px-3">Configurar regime</Button>
				<Button size="sm" onClick={() => setCalendarMonth(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))} className=" bg-white/10 text-white border border-white/20 hover:bg-white/15 h-8 px-3">Mês anterior</Button>
				<Button size="sm" onClick={() => setCalendarMonth(new Date(monthAnchor.getFullYear() - 1, monthAnchor.getMonth(), 1))} className=" bg-white/10 text-white border border-white/20 hover:bg-white/15 h-8 px-3">Há 1 ano</Button>
				<Button size="sm" onClick={async () => { await saveMonthToDb(); }} className=" bg-white/10 text-white border border-white/20 hover:bg-white/15 h-8 px-3">Salvar</Button>
			</div>
			<div className="relative flex">

				<div className="relative">
					<Calendar
						mode="single"
						selected={selected}
						onSelect={setSelected}
						month={monthAnchor}
						onMonthChange={() => { /* no-op to avoid fetching on day click */ }}
						className="rounded-md border bg-white/5 border-white/15"
						components={{ DayContent }}
					/>
				</div>
				<div className="flex flex-col gap-2 px-4">
					<div className="flex flex-wrap items-center gap-3 text-xs opacity-80">
						<TaskChip t="DAS" />
						<TaskChip t="DCTF" />
						<TaskChip t="FGTS" />
						<TaskChip t="IRPJ" />
						<TaskChip t="NF" />
						<TaskChip t="RECIBO" />
						<TaskChip t="FOLHA" />
					</div>
					<div className="flex items-center gap-3 text-xs opacity-80">
						<span>{NotifyEmoji.painel} Painel</span>
						<span>{NotifyEmoji.email} Email</span>
						<span>{NotifyEmoji.whatsapp} WhatsApp</span>
					</div>
				</div>
				{editing && (
					<Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
						<DialogContent className="sm:max-w-md bg-white/5 text-white border border-white/15 backdrop-blur-md">
							<DialogHeader>
								<DialogTitle className="text-white">Editar {editing.date}</DialogTitle>
							</DialogHeader>
							<div className="space-y-3 text-sm">
								<div className="font-medium">Obrigações</div>
								<div className="grid grid-cols-2 gap-2">
									{oblOptions.map((o) => {
										const allowBecauseSelectedHere = editing.selectedOblIds.includes(o.id);
										const alreadyUsedTipo = usedTiposThisMonthExcludingEditingDay.has(o.type);
										const selectedTypeSetNow = new Set((editing.selectedOblIds || []).map(id => optionsById[id]?.type).filter(Boolean) as TaskType[]);
										const sameTypeSelectedNow = selectedTypeSetNow.has(o.type) && !allowBecauseSelectedHere;
										const disabled = (alreadyUsedTipo || sameTypeSelectedNow) && !allowBecauseSelectedHere;
										return (
											<label key={o.id} className={`inline-flex items-center gap-2 text-xs ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
												<input
													type="checkbox"
													checked={editing.selectedOblIds.includes(o.id)}
													disabled={disabled}
													onChange={() => {
														const selectedIds = editing.selectedOblIds.includes(o.id)
															? editing.selectedOblIds.filter((x) => x !== o.id)
															: [...editing.selectedOblIds, o.id];
														setEditing({ ...editing, selectedOblIds: selectedIds });
													}}
												/>
												<TaskChip t={o.type} />
												<span className="opacity-70">{o.title}</span>
											</label>
										);
									})}
								</div>
								<div className="font-medium">Canal</div>
								<div className="flex items-center gap-3">
									{(["painel","email","whatsapp"] as NotifyType[]).map((c) => (
										<label key={c} className="inline-flex items-center gap-2">
											<input type="radio" name="channel" checked={editing.channel === c} onChange={() => setEditing({ ...editing, channel: c })} /> {c}
										</label>
									))}
								</div>
								<div className="font-medium">Template</div>
								<Input className="bg-white/10 text-white border-white/15 placeholder-white/50" placeholder="Código do template (ex.: DAS_VENC_MENSAL)" value={editing.templateCode} onChange={(e) => setEditing({ ...editing, templateCode: e.target.value })} />
							</div>
							<DialogFooter>
								<div className="flex items-center gap-2">
									<Button onClick={() => {
										if (!editing) return;
										const k = editing.date;
										setEventsByDay((prev) => {
											const next: Record<string, EventRow[]> = { ...prev };
											const selectedTipos = new Set((editing.selectedOblIds || []).map(id => optionsById[id]?.type).filter(Boolean) as TaskType[]);
											Object.keys(next).forEach((day) => {
												const d = new Date(day);
												if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
													next[day] = (next[day] || []).filter(r => {
														const t = r.obligation_id ? optionsById[r.obligation_id]?.type : null;
														return !t || !selectedTipos.has(t as TaskType);
													});
													if ((next[day] || []).length === 0) delete next[day];
												}
											});
											const upserts = editing.selectedOblIds.map((id) => {
												const opt = optionsById[id];
												return { company_id: companyId, accountant_id: accountantId, obligation_id: id, due_date: k, status: 'previsto', channel: editing.channel, template_code: editing.templateCode || '', referencia: opt ? JSON.stringify(opt.regra_vencimento) : null } as EventRow;
											});
											next[k] = upserts;
											return next;
										});
										setEditing(null);
									}}>Adicionar</Button>
									<Button onClick={() => setEditing(null)} variant="secondary" className="bg-white/5 text-white border border-white/15 hover:bg-white/10">Cancelar</Button>
								</div>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}
				{settingsOpen && (
					<Dialog open={settingsOpen} onOpenChange={(o) => !o && setSettingsOpen(false)}>
						<DialogContent className="sm:max-w-2xl bg-white/5 text-white border border-white/15 backdrop-blur-md">
							<DialogHeader>
								<DialogTitle className="text-white">Configurar regime</DialogTitle>
							</DialogHeader>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{oblOptions.map((o) => {
									const checked = settingsSelectedIds.includes(o.id);
									const due = deriveDueDate(o.regra_vencimento, monthAnchor);
									const selectedTypeSet = new Set(settingsSelectedIds.map(id => optionsById[id]?.type).filter(Boolean) as TaskType[]);
									const disabled = usedOblIdsThisMonth.has(o.id) || (selectedTypeSet.has(o.type) && !checked);
									return (
										<Card key={o.id} className={`cursor-pointer bg-white/5 border-white/15 hover:bg-white/10 ${checked ? 'ring-1 ring-white/40' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => {
											if (disabled) return;
											setSettingsSelectedIds((prev) => checked ? prev.filter(x => x !== o.id) : [...prev, o.id]);
										}}>
											<CardHeader>
												<CardTitle className="flex items-center justify-between text-sm text-white">
													<span className="flex items-center gap-2"><TaskChip t={o.type} /> {o.title}</span>
													<input className="accent-white/70" type="checkbox" checked={checked} disabled={disabled} onChange={() => {
														if (disabled) return;
														setSettingsSelectedIds((prev) => checked ? prev.filter(x => x !== o.id) : [...prev, o.id]);
													}} />
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="text-xs text-white/70">Vencimento estimado este mês: {dayKey(due)}</div>
										</CardContent>
									</Card>
									);
								})}
							</div>
							<DialogFooter>
								<div className="flex items-center gap-2">
									<Button onClick={() => {
										if (!settingsSelectedIds.length) { setSettingsOpen(false); return; }
										setEventsByDay((prev) => {
											const next: Record<string, EventRow[]> = { ...prev };
											const usedTypes = new Set<TaskType>();
											Object.entries(prev).forEach(([k, rows]) => {
												const d = new Date(k);
												if (d.getFullYear() === monthAnchor.getFullYear() && d.getMonth() === monthAnchor.getMonth()) {
													rows.forEach((r) => { const t = r.obligation_id ? optionsById[r.obligation_id]?.type : null; if (t) usedTypes.add(t); });
												}
											});
											settingsSelectedIds.forEach((id) => {
												const opt = optionsById[id]; if (!opt) return;
												const t = opt.type; if (usedTypes.has(t)) return;
												const due = deriveDueDate(opt.regra_vencimento, monthAnchor);
												const k = dayKey(due);
												const ev: EventRow = { company_id: companyId, accountant_id: accountantId, obligation_id: id, due_date: k, status: 'previsto', channel: 'painel', template_code: '', referencia: JSON.stringify(opt.regra_vencimento) };
												next[k] = (next[k] || []).filter(r => r.obligation_id !== id).concat(ev);
												usedTypes.add(t);
											});
											return next;
										});
										setSettingsOpen(false);
									}}>Adicionar</Button>
									<Button variant="secondary" onClick={() => setSettingsOpen(false)} className="bg-white/5 text-white border border-white/15 hover:bg-white/10">Cancelar</Button>
								</div>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</div>
	);
}


