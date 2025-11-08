// Variáveis e Constantes
const form = document.getElementById('transacao-form');
const transacoesLista = document.getElementById('transacoes-lista');
const saldoValor = document.getElementById('saldo-valor');
const VENCIMENTO_CHAVE = 'controleGastosTransacoes'; // Chave para localStorage

let transacoes = [];

// Funções Auxiliares de Vencimento
const checarVencimento = (dataVencimento) => {
    if (!dataVencimento) return ''; 

    const hoje = new Date();
    // Ajusta a data de hoje para o início do dia para comparação
    hoje.setHours(0, 0, 0, 0); 
    
    // Converte a data de vencimento para objeto Date
    const dataV = new Date(dataVencimento);
    // Ajusta a data de vencimento (vinda do input type='date' já deve estar no dia 00:00)
    
    const diffEmMs = dataV.getTime() - hoje.getTime();
    const diffEmDias = Math.ceil(diffEmMs / (1000 * 60 * 60 * 24));
    
    let classeAlerta = '';

    if (diffEmDias < 0) {
        // Vencido (Se não for uma receita)
        classeAlerta = 'alerta-vencido';
    } else if (diffEmDias >= 0 && diffEmDias <= 3) {
        // Vence em até 3 dias
        classeAlerta = 'alerta-proximo';
    }

    return classeAlerta;
};

// Funções de Persistência (localStorage)
const carregarTransacoes = () => {
    const dadosSalvos = localStorage.getItem(VENCIMENTO_CHAVE);
    if (dadosSalvos) {
        transacoes = JSON.parse(dadosSalvos);
    }
    renderizarTransacoes();
    calcularSaldo();
};

const salvarTransacoes = () => {
    localStorage.setItem(VENCIMENTO_CHAVE, JSON.stringify(transacoes));
};

// Função de Cálculo de Saldo
const calcularSaldo = () => {
    const totalReceitas = transacoes
        .filter(t => t.tipo === 'receita')
        .reduce((soma, t) => soma + t.valor, 0);

    const totalDespesas = transacoes
        .filter(t => t.tipo === 'despesa')
        .reduce((soma, t) => soma + t.valor, 0);

    const saldo = totalReceitas - totalDespesas;
    
    saldoValor.textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
    saldoValor.style.color = saldo >= 0 ? '#28a745' : '#dc3545';
};

// Função de Renderização (Exibe as transações na tabela)
const renderizarTransacoes = () => {
    transacoesLista.innerHTML = ''; // Limpa a lista antes de renderizar
    
    transacoes.forEach((t, index) => {
        const linha = document.createElement('tr');
        
        // Aplica o alerta de vencimento se for despesa e tiver data
        let classeAlerta = '';
        if (t.tipo === 'despesa' && t.dataVencimento) {
            classeAlerta = checarVencimento(t.dataVencimento);
        }
        linha.className = classeAlerta;

        const dataVencimentoFormatada = t.dataVencimento ? 
            new Date(t.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 
            '--';
        
        linha.innerHTML = `
            <td>${new Date(t.dataRegistro).toLocaleDateString('pt-BR')}</td>
            <td>${t.descricao}</td>
            <td class="${t.tipo}">${t.tipo === 'receita' ? 'Entrada' : 'Saída'}</td>
            <td>${dataVencimentoFormatada}</td>
            <td>R$ ${t.valor.toFixed(2).replace('.', ',')}</td>
            <td><button onclick="removerTransacao(${index})">X</button></td>
        `;

        transacoesLista.appendChild(linha);
    });
};

// Função de Adicionar Transação (Chamada pelo formulário)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const descricao = document.getElementById('descricao').value;
    const tipo = document.getElementById('tipo').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const dataVencimento = document.getElementById('vencimento').value;

    const novaTransacao = {
        descricao,
        tipo,
        valor: tipo === 'despesa' ? -Math.abs(valor) : Math.abs(valor), // Garante o sinal correto
        dataRegistro: new Date().toISOString().split('T')[0], // Data de hoje
        dataVencimento: tipo === 'despesa' ? dataVencimento : null 
    };

    transacoes.push(novaTransacao);
    salvarTransacoes();
    renderizarTransacoes();
    calcularSaldo();
    form.reset(); // Limpa o formulário
});

// Função de Remover Transação
const removerTransacao = (index) => {
    transacoes.splice(index, 1);
    salvarTransacoes();
    renderizarTransacoes();
    calcularSaldo();
};

// Inicialização: Carrega os dados quando a página é aberta
document.addEventListener('DOMContentLoaded', carregarTransacoes);