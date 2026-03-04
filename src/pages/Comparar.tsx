import { TalhaoComparative } from '@/components/talhoes/TalhaoComparative';
import { useTalhoes } from '@/hooks/useTalhoes';
import { Loader2 } from 'lucide-react';

const Comparar = () => {
  const { talhoes, loading } = useTalhoes();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <TalhaoComparative talhoes={talhoes} />;
};

export default Comparar;
