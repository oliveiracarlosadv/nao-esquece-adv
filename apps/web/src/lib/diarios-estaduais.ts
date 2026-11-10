/**
 * Diários Oficiais Estaduais e do DF.
 *
 * Não existe API nacional para os diários estaduais, e os sites oficiais não oferecem busca
 * automatizada aberta. Por isso o app faz BUSCA ASSISTIDA: abre o site oficial de cada estado
 * com a palavra-chave (nome completo, CPF ou OAB) já copiada para colar na busca do site.
 * Endereços conferidos em 10/11/2026.
 */
export type DiarioEstadual = { uf: string; nome: string; url: string; verificado: boolean };

export const DIARIOS_ESTADUAIS: DiarioEstadual[] = [
  { uf: 'AC', nome: 'Diário Oficial do Acre', url: 'https://www.diario.ac.gov.br', verificado: true },
  { uf: 'AL', nome: 'Diário Oficial de Alagoas', url: 'https://diario.imprensaoficial.al.gov.br', verificado: true },
  { uf: 'AP', nome: 'Diário Oficial do Amapá', url: 'https://diofe.portal.ap.gov.br', verificado: true },
  { uf: 'AM', nome: 'Diário Oficial do Amazonas', url: 'https://diario.imprensaoficial.am.gov.br', verificado: true },
  { uf: 'BA', nome: 'Diário Oficial da Bahia', url: 'https://dool.egba.ba.gov.br', verificado: true },
  { uf: 'CE', nome: 'Diário Oficial do Ceará', url: 'https://www.ceara.gov.br/diario-oficial/', verificado: true },
  { uf: 'DF', nome: 'Diário Oficial do Distrito Federal (DODF)', url: 'https://dodf.df.gov.br', verificado: true },
  { uf: 'ES', nome: 'Diário Oficial do Espírito Santo', url: 'https://ioes.dio.es.gov.br', verificado: true },
  { uf: 'GO', nome: 'Diário Oficial de Goiás', url: 'https://diariooficial.abc.go.gov.br', verificado: true },
  { uf: 'MA', nome: 'Diário Oficial do Maranhão', url: 'https://www.diariooficial.ma.gov.br', verificado: true },
  { uf: 'MT', nome: 'Diário Oficial de Mato Grosso (IOMAT)', url: 'https://www.iomat.mt.gov.br', verificado: true },
  { uf: 'MS', nome: 'Diário Oficial de Mato Grosso do Sul', url: 'https://www.spdo.ms.gov.br/diariodoe', verificado: false },
  { uf: 'MG', nome: 'Diário Oficial de Minas Gerais (Jornal Minas Gerais)', url: 'https://www.jornalminasgerais.mg.gov.br', verificado: true },
  { uf: 'PA', nome: 'Diário Oficial do Pará (IOEPA)', url: 'https://www.ioepa.com.br', verificado: true },
  { uf: 'PB', nome: 'Diário Oficial da Paraíba (A União)', url: 'https://auniao.pb.gov.br', verificado: true },
  { uf: 'PR', nome: 'Diário Oficial do Paraná (DIOE)', url: 'https://www.dioe.pr.gov.br', verificado: true },
  { uf: 'PE', nome: 'Diário Oficial de Pernambuco (CEPE)', url: 'https://diariooficial.cepe.com.br', verificado: true },
  { uf: 'PI', nome: 'Diário Oficial do Piauí', url: 'https://www.diario.pi.gov.br', verificado: true },
  { uf: 'RJ', nome: 'Diário Oficial do Rio de Janeiro (IOERJ)', url: 'https://www.ioerj.com.br', verificado: true },
  { uf: 'RN', nome: 'Diário Oficial do Rio Grande do Norte', url: 'https://www.diariooficial.rn.gov.br', verificado: true },
  { uf: 'RS', nome: 'Diário Oficial do Rio Grande do Sul', url: 'https://www.diariooficial.rs.gov.br', verificado: true },
  { uf: 'RO', nome: 'Diário Oficial de Rondônia', url: 'https://diof.ro.gov.br', verificado: true },
  { uf: 'RR', nome: 'Diário Oficial de Roraima', url: 'https://www.imprensaoficial.rr.gov.br', verificado: true },
  { uf: 'SC', nome: 'Diário Oficial de Santa Catarina', url: 'https://portal.doe.sea.sc.gov.br', verificado: true },
  { uf: 'SP', nome: 'Diário Oficial de São Paulo', url: 'https://www.doe.sp.gov.br/busca-avancada', verificado: true },
  { uf: 'SE', nome: 'Diário Oficial de Sergipe (IOSE)', url: 'https://iose.se.gov.br', verificado: true },
  { uf: 'TO', nome: 'Diário Oficial do Tocantins', url: 'https://diariooficial.to.gov.br', verificado: true },
];

export const DOU = { uf: 'BR', nome: 'Diário Oficial da União', url: 'https://www.in.gov.br/consulta', verificado: true };
