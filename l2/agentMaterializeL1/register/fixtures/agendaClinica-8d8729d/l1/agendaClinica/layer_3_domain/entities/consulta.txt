/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.ts" enhancement="_blank"/>
export interface Consulta {
  id: string;
  version: number;
  pacienteId: string;
  profissionalId: string;
  scheduledAt: string;
  status: 'scheduled' | 'noShow' | 'attended';
  details: {
    telephoneConfirmation: {
      confirmedAt: string;
    };
    attendanceNote: string;
  };
}
