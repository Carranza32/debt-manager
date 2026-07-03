'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { crearCategoria, actualizarCategoria, eliminarCategoria } from '@/app/actions/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Shield } from 'lucide-react';
import CategoryIcon from '@/components/category-icon';

const AVAILABLE_COLORS = [
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#f59e0b', label: 'Ámbar' },
  { hex: '#10b981', label: 'Esmeralda' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#8b5cf6', label: 'Violeta' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#06b6d4', label: 'Cian' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#71717a', label: 'Zinc' },
];

const AVAILABLE_ICONS = [
  'ShoppingCart',
  'Utensils',
  'Car',
  'Zap',
  'Film',
  'HeartPulse',
  'Shirt',
  'HelpCircle',
  'Gift',
  'Home',
  'BookOpen',
  'Plane',
];

interface CategoriasClientProps {
  categories: any[];
}

export default function CategoriasClient({ categories }: CategoriasClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create category form state
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8b5cf6');
  const [newIcon, setNewIcon] = useState('HelpCircle');

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Por favor, escribe un nombre para la categoría.');
      return;
    }

    startTransition(async () => {
      try {
        await crearCategoria(newName, newIcon, newColor);
        toast.success('Categoría creada correctamente');
        setNewName('');
        setNewColor('#8b5cf6');
        setNewIcon('HelpCircle');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al crear la categoría');
      }
    });
  };

  const handleOpenEdit = (category: any) => {
    setEditingCategory(category);
    setEditName(category.nombre);
    setEditColor(category.color || '#8b5cf6');
    setEditIcon(category.icono || 'HelpCircle');
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editingCategory) {
      toast.error('El nombre es obligatorio.');
      return;
    }

    startTransition(async () => {
      try {
        await actualizarCategoria(editingCategory.id, editName, editIcon, editColor);
        toast.success('Categoría actualizada correctamente');
        setIsEditOpen(false);
        setEditingCategory(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al actualizar la categoría');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría? Los gastos asociados perderán su categoría.')) {
      return;
    }

    startTransition(async () => {
      try {
        await eliminarCategoria(id);
        toast.success('Categoría eliminada');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al eliminar la categoría');
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans">Categorías</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Administra las categorías en las que clasificas tus gastos habituales.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Create Card */}
        <div className="glass-card md:col-span-1 h-fit rounded-[20px] shadow-sm">
          <div className="p-6 pb-2">
            <h3 className="text-lg font-bold text-foreground">Nueva Categoría</h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Crea una categoría personalizada.</p>
          </div>
          <form onSubmit={handleCreate}>
            <div className="p-6 pt-2 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Suscripciones"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                />
              </div>

              {/* Iconos */}
              <div className="space-y-1.5">
                <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Icono</Label>
                <div className="grid grid-cols-4 gap-2 border border-border bg-zinc-100/20 dark:bg-zinc-950/20 p-2.5 rounded-xl">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className={`flex h-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                        newIcon === icon 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-400 dark:text-zinc-550'
                      }`}
                    >
                      <CategoryIcon name={icon} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Colores */}
              <div className="space-y-1.5">
                <Label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">Color</Label>
                <div className="flex flex-wrap gap-2 border border-border bg-zinc-100/20 dark:bg-zinc-950/20 p-2.5 rounded-xl">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setNewColor(col.hex)}
                      style={{ backgroundColor: col.hex }}
                      title={col.label}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        newColor === col.hex ? 'border-white scale-110 shadow-md ring-2 ring-primary' : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 pt-2 border-t border-border flex justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer rounded-xl px-5 h-10 transition-all"
              >
                <Plus className="mr-1 h-4 w-4" />
                Añadir
              </Button>
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-foreground">Lista de Categorías</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((cat) => (
              <div key={cat.id} className="glass-card rounded-[20px] shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 shadow-sm"
                    >
                      <CategoryIcon name={cat.icono} className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{cat.nombre}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                        {cat.es_default ? 'Por defecto' : 'Personalizada'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {cat.es_default ? (
                      <Badge className="bg-zinc-150 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-850 text-[9px] font-bold py-0.5 px-2 rounded-full uppercase tracking-wider flex gap-1 items-center">
                        <Shield className="h-3 w-3" />
                        Bloqueada
                      </Badge>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-zinc-155 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cat.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-card max-w-sm rounded-[20px] shadow-2xl p-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-foreground">Editar Categoría</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Modifica los detalles visuales de la categoría.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-2">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-nombre" className="text-zinc-700 dark:text-zinc-300">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isPending}
                  className="border border-input bg-background text-foreground rounded-xl h-10 px-3 py-2 text-sm"
                />
              </div>

              {/* Iconos */}
              <div className="space-y-1.5">
                <Label className="text-zinc-700 dark:text-zinc-300">Icono</Label>
                <div className="grid grid-cols-4 gap-2 border border-border bg-zinc-100/20 dark:bg-zinc-950/20 p-2.5 rounded-xl">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditIcon(icon)}
                      className={`flex h-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                        editIcon === icon 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-400 dark:text-zinc-550'
                      }`}
                    >
                      <CategoryIcon name={icon} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Colores */}
              <div className="space-y-1.5">
                <Label className="text-zinc-700 dark:text-zinc-300">Color</Label>
                <div className="flex flex-wrap gap-2 border border-border bg-zinc-100/20 dark:bg-zinc-950/20 p-2.5 rounded-xl">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setEditColor(col.hex)}
                      style={{ backgroundColor: col.hex }}
                      title={col.label}
                      className={`h-7 w-7 rounded-full border-2 transition-all cursor-pointer ${
                        editColor === col.hex ? 'border-white scale-110 shadow-md ring-2 ring-primary' : 'border-transparent hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:opacity-90 font-semibold cursor-pointer rounded-xl px-5 h-10 transition-all"
              >
                {isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
