import { PainelEmprestimo } from './PainelEmprestimo';
import { PainelMulta } from './PainelMulta';

export function App() {
  return (
    <main className="pagina">
      <header>
        <h1>Biblioteca Universitária</h1>
        <p>
          Regras de empréstimo (RF01) e multa por atraso (RF02) — módulo <code>CalculadoraEmprestimo</code>
        </p>
      </header>
      <div className="paineis">
        <PainelEmprestimo />
        <PainelMulta />
      </div>
    </main>
  );
}
