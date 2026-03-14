import { useState } from 'react';
import { useBrandKit } from '@/hooks/useBrandKit';
import { useProjectApi, BrandKitProfile, ColorRole, ColorSwatch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CheckCircle2, Palette, Loader2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BrandSettings() {
    const api = useProjectApi();
    const { brandKits, activeBrandProfile, isLoading, switchBrand, refreshKits } = useBrandKit();
    const [isSaving, setIsSaving] = useState(false);

    // Form state for editing/creating
    const [editingBrand, setEditingBrand] = useState<Partial<BrandKitProfile> | null>(null);

    const handleCreateNew = () => {
        setEditingBrand({
            name: 'New Brand Kit',
            logos: [],
            colors: [{ hex: '#000000', name: 'Dark', role: 'primary_text' }],
            typography: { primaryFont: 'Inter', secondaryFont: 'Inter' }
        });
    };

    const handleEdit = (kit: BrandKitProfile) => {
        setEditingBrand({ ...kit });
    };

    const handleAddColor = () => {
        if (!editingBrand) return;
        setEditingBrand({
            ...editingBrand,
            colors: [...(editingBrand.colors || []), { hex: '#FFFFFF', name: 'New Color', role: 'background' }]
        });
    };

    const handleUpdateColor = (index: number, field: keyof ColorSwatch, value: string) => {
        if (!editingBrand || !editingBrand.colors) return;
        const newColors = [...editingBrand.colors];
        newColors[index] = { ...newColors[index], [field]: value };
        setEditingBrand({ ...editingBrand, colors: newColors });
    };

    const handleRemoveColor = (index: number) => {
        if (!editingBrand || !editingBrand.colors) return;
        const newColors = editingBrand.colors.filter((_, i) => i !== index);
        setEditingBrand({ ...editingBrand, colors: newColors });
    };

    const handleAddLogoUrl = () => {
        if (!editingBrand) return;
        setEditingBrand({
            ...editingBrand,
            logos: [...(editingBrand.logos || []), '']
        });
    };

    const handleUpdateLogoUrl = (index: number, value: string) => {
        if (!editingBrand || !editingBrand.logos) return;
        const newLogos = [...editingBrand.logos];
        newLogos[index] = value;
        setEditingBrand({ ...editingBrand, logos: newLogos });
    };

    const handleRemoveLogo = (index: number) => {
         if (!editingBrand || !editingBrand.logos) return;
        const newLogos = editingBrand.logos.filter((_, i) => i !== index);
        setEditingBrand({ ...editingBrand, logos: newLogos });
    }

    const handleSave = async () => {
        if (!editingBrand || !editingBrand.name || !editingBrand.colors?.length) return;
        setIsSaving(true);

        try {
            if (editingBrand.id) {
                await api.updateBrandKit(editingBrand.id, editingBrand);
            } else {
                const payload: Omit<BrandKitProfile, 'id' | 'created_at' | 'updated_at' | 'user_id'> = {
                    name: editingBrand.name,
                    logos: editingBrand.logos || [],
                    colors: editingBrand.colors || [],
                    typography: editingBrand.typography || { primaryFont: 'Inter', secondaryFont: 'Inter' },
                    logo_url: null,
                    is_active: false
                };
                await api.saveBrandKit(payload);
            }
            await refreshKits();
            setEditingBrand(null); // Return to list view
        } catch (error) {
             console.error("Error saving brand kit", error);
        } finally {
            setIsSaving(false);
        }
    };


    const handleDelete = async (kitId: string) => {
        if (!confirm("Yakin mau dihapus?")) return;
        try {
            await api.deleteBrandKit(kitId);
            refreshKits();
        } catch(e) {
            console.error(e);
        }
    }


    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    // --- FORM VIEW ---
    if (editingBrand) {
        return (
            <Card className="w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{editingBrand.id ? 'Edit Brand Kit' : 'Create Brand Kit'}</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setEditingBrand(null)}>Batal</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Simpan
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Label>Nama Brand</Label>
                        <Input 
                            value={editingBrand.name || ''} 
                            onChange={e => setEditingBrand({...editingBrand, name: e.target.value})} 
                            placeholder="Misal: Bite Cake"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Logos (URL)</Label>
                            <Button variant="outline" size="sm" onClick={handleAddLogoUrl}><Plus className="w-4 h-4 mr-1"/> Tambah Logo</Button>
                        </div>
                        {editingBrand.logos?.map((logo, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Input 
                                    value={logo} 
                                    onChange={e => handleUpdateLogoUrl(i, e.target.value)} 
                                    placeholder="https://..."
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLogo(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                        ))}
                    </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Tipografi</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label className="text-xs text-muted-foreground">Primary Font (Headline)</Label>
                                <Input 
                                    value={editingBrand.typography?.primaryFont || ''} 
                                    onChange={e => setEditingBrand({...editingBrand, typography: { ...editingBrand.typography, primaryFont: e.target.value }})} 
                                    placeholder="e.g. Poppins"
                                />
                             </div>
                             <div>
                                <Label className="text-xs text-muted-foreground">Secondary Font (Body)</Label>
                                <Input 
                                    value={editingBrand.typography?.secondaryFont || ''} 
                                    onChange={e => setEditingBrand({...editingBrand, typography: { ...editingBrand.typography, secondaryFont: e.target.value }})} 
                                    placeholder="e.g. Inter"
                                />
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Warna Brand</Label>
                            <Button variant="outline" size="sm" onClick={handleAddColor}><Plus className="w-4 h-4 mr-1"/> Tambah Warna</Button>
                        </div>
                        <div className="space-y-2">
                            {editingBrand.colors?.map((color, i) => (
                                <div key={i} className="flex gap-3 items-center bg-muted/30 p-3 rounded-lg border">
                                    <div className="w-10 h-10 rounded shadow-sm border" style={{ backgroundColor: color.hex }}></div>
                                    <Input 
                                        className="w-24 font-mono text-sm" 
                                        value={color.hex} 
                                        onChange={e => handleUpdateColor(i, 'hex', e.target.value)}
                                        placeholder="#000000"
                                    />
                                     <Input 
                                        className="flex-1" 
                                        value={color.name} 
                                        onChange={e => handleUpdateColor(i, 'name', e.target.value)}
                                        placeholder="Nama Warna (Opsional)"
                                    />
                                    <Select 
                                        value={color.role} 
                                        onValueChange={(val: ColorRole) => handleUpdateColor(i, 'role', val)}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Pilih Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="background">Background</SelectItem>
                                            <SelectItem value="primary_text">Primary Text</SelectItem>
                                            <SelectItem value="secondary_text">Secondary Text</SelectItem>
                                            <SelectItem value="accent">Accent</SelectItem>
                                            <SelectItem value="primary">Primary</SelectItem>
                                            <SelectItem value="secondary">Secondary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveColor(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- LIST VIEW ---
    return (
        <Card className="shadow-sm border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/40 px-6 sm:px-8 py-5">
                <CardTitle className="text-base font-semibold">
                    Daftar Smart Brand Kit
                </CardTitle>
                <Button size="sm" className="gap-1.5 h-8 font-medium" onClick={handleCreateNew}>
                    <Plus className="h-4 w-4" />
                    Buat Baru
                </Button>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
                {brandKits.length === 0 ? (
                     <div className="text-center py-12">
                        <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Belum ada Brand Kit. Buat satu untuk memulai.</p>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {brandKits.map((kit: BrandKitProfile) => (
                            <div key={kit.id} className={`p-5 rounded-xl border flex flex-col gap-4 transition-all ${kit.id === activeBrandProfile?.id ? 'border-primary shadow-sm bg-primary/5' : 'bg-background hover:border-primary/50'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            {kit.name}
                                            {kit.id === activeBrandProfile?.id && (
                                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Aktif
                                                </span>
                                            )}
                                        </h3>
                                         <p className="text-xs text-muted-foreground mt-1">
                                            {kit.typography?.primaryFont || 'Default Font'} • {kit.colors?.length || 0} Warna
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {kit.id !== activeBrandProfile?.id && (
                                            <Button variant="secondary" size="sm" onClick={() => switchBrand(kit.id)}>Set Aktif</Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(kit)}>Edit</Button>
                                        <Button variant="ghost" size="sm" className="text-destructive " onClick={() => handleDelete(kit.id)}>Hapus</Button>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {kit.colors?.map((c: ColorSwatch, i: number) => (
                                        <div key={i} className="group relative">
                                            <div className="w-10 h-10 rounded-full border shadow-sm" style={{backgroundColor: c.hex}}></div>
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity pointer-events-none">
                                                {c.role}: {c.hex}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
