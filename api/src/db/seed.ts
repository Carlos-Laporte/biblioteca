// Dados FICTÍCIOS para demonstração (nomes, matrículas, e-mails e ISBNs inventados).
import { count } from 'drizzle-orm';
import { calcularDataDevolucao, calcularDiasAtraso, CalculadoraEmprestimo } from '../../../src/domain';
import type { PerfilUsuario } from '../../../src/domain';
import type { Banco } from './conexao';
import { emprestimos, livros, multas, usuarios } from './schema';

const MS_POR_DIA = 86_400_000;
const TAMANHO_DATA = 10;
const CENTAVOS = 100;

type Perfil = PerfilUsuario;

const USUARIOS: ReadonlyArray<readonly [string, string, Perfil]> = [
  ['Ana Beatriz Souza', 'G2024001', 'GRADUACAO'],
  ['Bruno Henrique Lima', 'G2024002', 'GRADUACAO'],
  ['Carla Mendes Rocha', 'G2024003', 'GRADUACAO'],
  ['Daniel Ferreira Alves', 'G2024004', 'GRADUACAO'],
  ['Eduarda Martins Costa', 'G2024005', 'GRADUACAO'],
  ['Felipe Araújo Nunes', 'G2024006', 'GRADUACAO'],
  ['Gabriela Ribeiro Dias', 'G2024007', 'GRADUACAO'],
  ['Heitor Carvalho Pinto', 'P2023001', 'POS_GRADUACAO'],
  ['Isabela Gomes Teixeira', 'P2023002', 'POS_GRADUACAO'],
  ['João Victor Barbosa', 'P2023003', 'POS_GRADUACAO'],
  ['Larissa Moreira Cunha', 'P2023004', 'POS_GRADUACAO'],
  ['Mateus Oliveira Prado', 'P2023005', 'POS_GRADUACAO'],
  ['Profa. Natália Vieira', 'D1001', 'PROFESSOR'],
  ['Prof. Otávio Santana', 'D1002', 'PROFESSOR'],
  ['Profa. Patrícia Lopes', 'D1003', 'PROFESSOR'],
];

const LIVROS: ReadonlyArray<readonly [string, string, number, number]> = [
  ['Dom Casmurro', 'Machado de Assis', 1899, 4],
  ['Memórias Póstumas de Brás Cubas', 'Machado de Assis', 1881, 3],
  ['Grande Sertão: Veredas', 'João Guimarães Rosa', 1956, 2],
  ['Vidas Secas', 'Graciliano Ramos', 1938, 3],
  ['O Cortiço', 'Aluísio Azevedo', 1890, 2],
  ['Iracema', 'José de Alencar', 1865, 2],
  ['A Hora da Estrela', 'Clarice Lispector', 1977, 3],
  ['Macunaíma', 'Mário de Andrade', 1928, 2],
  ['Capitães da Areia', 'Jorge Amado', 1937, 3],
  ['O Quinze', 'Rachel de Queiroz', 1930, 2],
  ['Engenharia de Software', 'Ian Sommerville', 2019, 5],
  ['Código Limpo', 'Robert C. Martin', 2009, 4],
  ['Refatoração', 'Martin Fowler', 2018, 3],
  ['Padrões de Projeto', 'Erich Gamma et al.', 1994, 3],
  ['Desenvolvimento Guiado por Testes', 'Kent Beck', 2002, 3],
  ['Arquitetura Limpa', 'Robert C. Martin', 2017, 3],
  ['Domain-Driven Design', 'Eric Evans', 2003, 2],
  ['Algoritmos: Teoria e Prática', 'Thomas H. Cormen et al.', 2009, 4],
  ['Estruturas de Dados e Algoritmos', 'Nivio Ziviani', 2004, 3],
  ['Sistemas de Banco de Dados', 'Ramez Elmasri', 2011, 3],
  ['Redes de Computadores', 'Andrew S. Tanenbaum', 2011, 3],
  ['Sistemas Operacionais Modernos', 'Andrew S. Tanenbaum', 2015, 2],
  ['Introdução à Teoria da Computação', 'Michael Sipser', 2012, 2],
  ['Cálculo — Volume 1', 'James Stewart', 2013, 6],
  ['Álgebra Linear', 'José Luiz Boldrini', 1986, 4],
  ['Probabilidade e Estatística', 'Morris H. DeGroot', 2012, 3],
  ['Fundamentos de Física — Mecânica', 'David Halliday', 2016, 5],
  ['Química Geral', 'John B. Russell', 1994, 3],
  ['Agronomia Tropical', 'Ana M. Primavesi', 2002, 2],
  ['Metodologia Científica', 'Antônio Carlos Gil', 2017, 5],
];

/** Empréstimos relativos a "hoje": [usuário, livro, dias atrás do empréstimo, dias atrás da devolução | null, multa paga] */
const CENARIO: ReadonlyArray<readonly [number, number, number, number | null, boolean]> = [
  [0, 0, 4, null, false], // Ana: 2 livros em dia
  [0, 10, 4, null, false],
  [1, 1, 10, null, false], // Bruno: no limite (3/3)
  [1, 11, 10, null, false],
  [1, 14, 2, null, false],
  [2, 3, 20, null, false], // Carla: livro em atraso → bloqueada
  [3, 12, 40, 30, false], // Daniel: devolveu com 15 dias de atraso, multa em aberto → bloqueado
  [4, 4, 60, 40, true], // Eduarda: multa já paga
  [5, 17, 14, null, false], // Felipe: vence amanhã
  [7, 16, 25, null, false], // Heitor (Pós): em dia
  [7, 19, 25, null, false],
  [8, 20, 70, 20, false], // Isabela: 50 dias de atraso → teto R$ 150
  [9, 2, 31, null, false], // João: 1 dia de atraso
  [12, 21, 30, null, false], // Profa. Natália: 6 livros
  [12, 22, 30, null, false],
  [12, 23, 30, null, false],
  [12, 24, 5, null, false],
  [12, 25, 5, null, false],
  [12, 26, 5, null, false],
  [13, 27, 50, 10, false], // Prof. Otávio: devolução no prazo (sem multa)
  [6, 29, 30, 18, false], // Gabriela: devolvida no dia previsto
];

function deslocar(data: string, dias: number): string {
  return new Date(Date.parse(data) - dias * MS_POR_DIA).toISOString().slice(0, TAMANHO_DATA);
}

const isbnFicticio = (indice: number) => `978-0-00-${String(indice + 1).padStart(6, '0')}-0`;

const calculadora = new CalculadoraEmprestimo();

interface Ids {
  readonly usuarios: number[];
  readonly livros: number[];
}

async function inserirEmprestimo(db: Banco, ids: Ids, linha: (typeof CENARIO)[number], hoje: string) {
  const [indiceUsuario, indiceLivro, diasEmprestimo, diasDevolucao, paga] = linha;
  const perfil = USUARIOS[indiceUsuario][2];
  const dataEmprestimo = deslocar(hoje, diasEmprestimo);
  const dataPrevista = calcularDataDevolucao(dataEmprestimo, perfil);
  const dataDevolucao = diasDevolucao === null ? null : deslocar(hoje, diasDevolucao);
  const [criado] = await db
    .insert(emprestimos)
    .values({ usuarioId: ids.usuarios[indiceUsuario], livroId: ids.livros[indiceLivro], dataEmprestimo, dataPrevista, dataDevolucao })
    .returning();
  const diasAtraso = calcularDiasAtraso(dataPrevista, dataDevolucao ?? dataPrevista);
  const valorCentavos = Math.round(calculadora.calcularMulta(diasAtraso, perfil) * CENTAVOS);
  if (valorCentavos === 0) return;
  await db.insert(multas).values({
    emprestimoId: criado.id,
    usuarioId: criado.usuarioId,
    diasAtraso,
    valorCentavos,
    pagaEm: paga ? hoje : null,
  });
}

/** Popula o banco apenas se ainda não houver usuários (idempotente). */
export async function popularSeVazio(db: Banco, hoje: string): Promise<boolean> {
  const [{ total }] = await db.select({ total: count() }).from(usuarios);
  if (total > 0) return false;

  const criadosUsuarios = await db
    .insert(usuarios)
    .values(USUARIOS.map(([nome, matricula, perfil]) => ({
      nome,
      matricula,
      perfil,
      email: `${matricula.toLowerCase()}@academico.exemplo`,
    })))
    .returning({ id: usuarios.id });
  const criadosLivros = await db
    .insert(livros)
    .values(LIVROS.map(([titulo, autor, ano, exemplaresTotal], indice) => ({
      titulo,
      autor,
      ano,
      exemplaresTotal,
      isbn: isbnFicticio(indice),
    })))
    .returning({ id: livros.id });
  const ids = { usuarios: criadosUsuarios.map((usuario) => usuario.id), livros: criadosLivros.map((livro) => livro.id) };
  for (const linha of CENARIO) {
    await inserirEmprestimo(db, ids, linha, hoje);
  }
  return true;
}
