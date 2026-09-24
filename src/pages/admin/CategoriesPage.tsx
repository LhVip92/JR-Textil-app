import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import { listAllCategories, createCategory, updateCategory, type CategoryInput } from '@/services/categories.service';
import type { Category } from '@/types/database';

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try { setItems(await listAllCategories()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold mb-1">Categorias</h1>
      <p className="text-sm text-black/60 mb-5">Organizam o catálogo público.</p>
      <NewCategoryForm onCreated={reload} />
      {loading && <p className="text-sm text-black/60">Carregando...</p>}
      {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
      {!loading && items.length === 0 && <p className="text-sm text-black/60">Nenhuma categoria ainda.</p>}
      <ul className="divide-y divide-black/5 bg-white rounded-xl border border-black/5 mt-2">
        {items.map((cat) => (
          <li key={cat.id} className="p-4 flex items-center gap-3">
            {editingId === cat.id ? (
              <EditCategoryRow category={cat} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); void reload(); }} />
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cat.name}{!cat.is_active && <span className="ml-2 text-xs px-2 py-0.5 bg-black/10 rounded">inativa</span>}</p>
                  <p className="text-xs text-black/50 truncate">/{cat.slug}</p>
                </div>
                <button onClick={() => setEditingId(cat.id)} className="p-2 rounded hover:bg-black/5" aria-label={`Editar ${cat.name}`}><Pencil size={16} /></button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try { await createCategory({ name, slug: name }); setName(''); onCreated(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro.'); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da nova categoria" className="flex-1 px-3 py-2 border border-black/15 rounded-lg focus:border-brand-red outline-none" aria-label="Nome" />
      <button type="submit" disabled={submitting || !name.trim()} className="inline-flex items-center gap-1 bg-brand-red hover:bg-brand-redDark text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-60"><Plus size={16} /> Adicionar</button>
      {error && <span className="text-brand-red text-sm">{error}</span>}
    </form>
  );
}

function EditCategoryRow({ category, onCancel, onSaved }: { category: Category; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category.name);
  const [isActive, setIsActive] = useState(category.is_active);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { const payload: Partial<CategoryInput> = { name, is_active: isActive }; await updateCategory(category.id, payload); onSaved(); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex-1 flex items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-2 py-1 border border-black/15 rounded" aria-label="Nome" />
      <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />Ativa</label>
      <button onClick={save} disabled={saving} className="p-2 rounded hover:bg-black/5" aria-label="Salvar"><Check size={16} className="text-green-600" /></button>
      <button onClick={onCancel} className="p-2 rounded hover:bg-black/5" aria-label="Cancelar"><X size={16} /></button>
    </div>
  );
}