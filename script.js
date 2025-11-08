// Removidas as variáveis e chaves do localStorage.
const form = document.getElementById('transacao-form');
const transacoesLista = document.getElementById('transacoes-lista');
const saldoValor = document.getElementById('saldo-valor');

// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCupYqHhZ41FrlAhWP4vC4Rb13O_yvg1dA",
    authDomain: "casa-4011d.firebaseapp.com",
    projectId: "casa-4011d",
    storageBucket: "casa-4011d.firebasestorage.app",
    messagingSenderId: "1069776396379",
    appId: "1:1069776396379:web:2672e5b1a0135efd08df7e",
    measurementId: "G-P8MSY41D1V"
};

const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const dbRef = database.ref('transacoes'); // Referência à coleção de transações
let transacoes = []; // O array será preenchido pelos dados do Firebase

// Funções Auxiliares de Vencimento (Sem Alteração)
const checarVencimento = (dataVencimento) => {
    if (!dataVencimento) return ''; 

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    
    const dataV = new Date(dataVencimento);
    
    const diffEmMs = dataV.getTime() - hoje.getTime();
    const diffEmDias = Math.ceil(diffEmMs / (1000 * 60 * 60 * 24));
    
    let classeAlerta = '';

    if (diffEmDias < 0) {
        classeAlerta = 'alerta-vencido';
    } else if (diffEmDias >= 0 && diffEmDias <= 3) {
        classeAlerta = 'alerta-proximo';
    }

    return classeAlerta;
};


// 2. FUNÇÃO DE CÁLCULO DE SALDO (Sem Alteração)
const calcularSaldo = () => {
    const saldo = transacoes.reduce((soma, t) => soma + t.valor, 0);
    
    saldoValor.textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
    saldoValor.style.color = saldo >= 0 ? '#28a745' : '#dc3545';
};


// 3. FUNÇÃO DE REMOÇÃO (MODIFICADA para usar o ID do Firebase)
const removerTransacao = (id) => {
    // Remove o item usando o ID único do Firebase
    database.ref('transacoes/' + id).remove();
    // O 'dbRef.on("value")' fará o resto (atualizar a tela e o saldo)
};


// 4. FUNÇÃO DE MARCAR PAGO (MODIFICADA para usar o ID do Firebase)
const marcarComoPago = (id, isChecked) => {
    // Atualiza apenas o campo 'pago' no Firebase
    database.ref('transacoes/' + id).update({
        pago: isChecked
    });
    // O 'dbRef.on("value")' fará o resto (reordenar e atualizar a tela)
};


// 5. FUNÇÃO DE RENDERIZAÇÃO (MODIFICADA para usar o ID do Firebase)
const renderizarTransacoes = () => {
    transacoesLista.innerHTML = ''; 
    
    transacoes.forEach((t) => { // Removido o index do loop, pois usaremos t.id
        const linha = document.createElement('tr');
        
        const estaPaga = t.pago === true;
        let classeAlerta = '';
        
        if (t.tipo === 'despesa' && t.dataVencimento && !estaPaga) { 
            classeAlerta = checarVencimento(t.dataVencimento);
        }
        
        if (estaPaga) {
             linha.classList.add('transacao-paga');
        }

        linha.className = classeAlerta + (estaPaga && t.tipo === 'despesa' ? ' transacao-paga' : '');

        const dataVencimentoFormatada = t.dataVencimento ? 
            new Date(t.dataVencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 
            '--';

        let checkboxHTML = '';
        if (t.tipo === 'despesa') {
            const checked = estaPaga ? 'checked' : '';
            // 🚨 NOVO: Passamos o ID da transação (t.id) para as funções
            checkboxHTML = `<input type="checkbox" ${checked} onclick="marcarComoPago('${t.id}', this.checked)">`; 
        } else {
            checkboxHTML = 'N/A';
        }

        linha.innerHTML = `
            <td>${new Date(t.dataRegistro).toLocaleDateString('pt-BR')}</td>
            <td>${t.descricao}</td>
            <td class="${t.tipo}">${t.tipo === 'receita' ? 'Entrada' : 'Saída'}</td>
            <td>${dataVencimentoFormatada}</td>
            <td>R$ ${t.valor.toFixed(2).replace('.', ',')}</td>
            <td>${checkboxHTML}</td>
            <td><button onclick="removerTransacao('${t.id}')">X</button></td> `;

        transacoesLista.appendChild(linha);
    });
};


// 6. FUNÇÃO DE ADICIONAR TRANSAÇÃO (MODIFICADA para enviar ao Firebase)
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const descricao = document.getElementById('descricao').value;
    const tipo = document.getElementById('tipo').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const dataVencimento = document.getElementById('vencimento').value;

    const novaTransacao = {
        descricao,
        tipo,
        valor: tipo === 'despesa' ? -Math.abs(valor) : Math.abs(valor),
        dataRegistro: new Date().toISOString().split('T')[0],
        dataVencimento: tipo === 'despesa' ? dataVencimento : null,
        pago: tipo === 'despesa' ? false : true,
        // Adicionamos um timestamp para ajudar na ordenação de itens novos
        timestamp: Date.now() 
    };

    // 🛑 Substitui a lógica de salvamento local e recarregamento
    dbRef.push(novaTransacao); 
    
    form.reset();
});


// 7. OUVINTE DE DADOS DO FIREBASE (Substitui carregarTransacoes e salvarTransacoes)
dbRef.on('value', (snapshot) => {
    const dadosDoFirebase = snapshot.val();
    
    if (dadosDoFirebase) {
        // 1. Converte o objeto Firebase em um array, adicionando a ID como propriedade 'id'
        let carregadas = Object.keys(dadosDoFirebase).map(key => ({
            id: key, 
            ...dadosDoFirebase[key]
        }));
        
        // 2. Aplica a lógica de ordenação (Não-Pagas e Vencidas primeiro)
        carregadas.sort((a, b) => {
            // Prioriza receitas para baixo, despesas para cima
            if (a.tipo === 'receita' && b.tipo === 'despesa') return 1;
            if (a.tipo === 'despesa' && b.tipo === 'receita') return -1;
            
            // Ordena as despesas: Não pagas (false) vêm antes das pagas (true)
            if (a.pago !== b.pago) {
                return a.pago ? 1 : -1; // false (-1) vem antes de true (1)
            }
            
            // Se ambas têm o mesmo status, ordena por data de vencimento (as mais antigas primeiro)
            if (a.dataVencimento && b.dataVencimento) {
                 return new Date(a.dataVencimento) - new Date(b.dataVencimento);
            }
            return 0;
        });

        transacoes = carregadas;
    } else {
         transacoes = [];
    }
    
    // Atualiza a interface
    renderizarTransacoes();
    calcularSaldo();
});