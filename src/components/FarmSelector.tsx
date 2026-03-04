import { useState } from 'react';
import { ChevronDown, Plus, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFarmData } from '@/hooks/useFarmData';

export function FarmSelector() {
  const { farms, selectedFarm, setSelectedFarmId, addFarm, deleteFarm } = useFarmData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');

  const handleAddFarm = () => {
    if (newFarmName.trim()) {
      addFarm(newFarmName.trim());
      setNewFarmName('');
      setIsAddDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="min-w-[180px] justify-between h-9 text-sm font-normal"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">
                {selectedFarm ? selectedFarm.name : 'Selecione uma fazenda'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {farms.length > 0 ? (
            farms.map((farm) => (
              <DropdownMenuItem 
                key={farm.id}
                className="flex items-center justify-between group cursor-pointer"
                onClick={() => setSelectedFarmId(farm.id)}
              >
                <span className={selectedFarm?.id === farm.id ? 'font-medium' : ''}>
                  {farm.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFarm(farm.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">Nenhuma fazenda</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsAddDialogOpen(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Nova Fazenda
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Fazenda</DialogTitle>
            <DialogDescription>
              Cadastre uma nova fazenda para gerenciar seus dados.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="farmName">Nome da Fazenda</Label>
              <Input
                id="farmName"
                placeholder="Ex: Fazenda São João"
                value={newFarmName}
                onChange={(e) => setNewFarmName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFarm()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFarm} disabled={!newFarmName.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
