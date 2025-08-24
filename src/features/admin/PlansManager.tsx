import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlansManager: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciador de Planos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Componente temporariamente desabilitado enquanto o banco de dados é atualizado.
        </p>
      </CardContent>
    </Card>
  );
};

export default PlansManager;