/**
 * RUPEEFLOW ENGINE - OPTIMIZED FOR INDIAN RUPEE METRIC SYSTEM (LAKH/CRORE)
 */
class RupeeFlowApp {
    constructor() {
        this.storageKey = 'rupeeflow_db_v1';
        this.db = this.loadDatabase();
        this.charts = {};
        
        this.init();
    }

    loadDatabase() {
        const defaults = {
            income: [],
            expenses: [],
            investments: { stocks: [], mf: [], sip: [] },
            loans: [],
            family: [],
            budgets: { Food: 15000, Rent: 25000, Transport: 5000, Shopping: 10000, Entertainment: 8000, Others: 12000 },
            goals: []
        };
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : defaults;
    }

    saveDatabase() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.db));
        this.refreshAllUIStructures();
    }

    init() {
        this.registerNavigationEvents();
        this.registerMobileNavigationSwitches();
        this.registerModalTriggers();
        this.registerFormSubmissions();
        this.registerSearchAndFilters();
        this.initTheme();
        
        this.refreshAllUIStructures();
    }

    /* THEME LOGISTICS */
    initTheme() {
        const toggle = document.getElementById('themeToggle');
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const target = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            toggle.innerHTML = target === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        });
    }

    /* MOBILE NAVIGATION CONTROLLERS */
    registerMobileNavigationSwitches() {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.getElementById('menuToggleBtn');
        const closeBtn = document.getElementById('mobileCloseBtn');

        menuBtn.addEventListener('click', () => sidebar.classList.add('mobile-active'));
        closeBtn.addEventListener('click', () => sidebar.classList.remove('mobile-active'));
    }

    registerNavigationEvents() {
        document.querySelectorAll('.nav-item').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                const targetViewId = button.getAttribute('data-target');
                document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
                document.getElementById(targetViewId).classList.add('active');
                
                // Close sidebar on mobile item tap
                document.getElementById('sidebar').classList.remove('mobile-active');
                
                if(targetViewId === 'reports' || targetViewId === 'dashboard') {
                    setTimeout(() => this.renderCharts(), 50);
                }
            });
        });
    }

    refreshAllUIStructures() {
        this.renderDashboardKPIs();
        this.renderRecentTransactions();
        this.renderIncomeLedger();
        this.renderExpenseLedger();
        this.renderInvestmentSubsystem();
        this.renderLoanSubsystem();
        this.renderFamilySubsystem();
        this.renderBudgetEnforcements();
        this.renderGoalsStructure();
    }

    renderDashboardKPIs() {
        const totalIncome = this.db.income.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalExpenses = this.db.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalFamily = this.db.family.reduce((sum, item) => sum + Number(item.amount), 0);
        
        const stockInvested = this.db.investments.stocks.reduce((sum, item) => sum + (item.qty * item.purchase), 0);
        const stockCurrent = this.db.investments.stocks.reduce((sum, item) => sum + (item.qty * item.current), 0);
        const mfInvested = this.db.investments.mf.reduce((sum, item) => sum + Number(item.invested), 0);
        const mfCurrent = this.db.investments.mf.reduce((sum, item) => sum + Number(item.current), 0);
        const totalInvestedValue = stockCurrent + mfCurrent;
        
        const loansGiven = this.db.loans.filter(l => l.type === 'Given').reduce((sum, l) => sum + Number(l.amount), 0);
        const loansTaken = this.db.loans.filter(l => l.type === 'Taken').reduce((sum, l) => sum + Number(l.amount), 0);

        const netSavings = totalIncome - totalExpenses - totalFamily;
        const netWorth = netSavings + totalInvestedValue + loansGiven - loansTaken;

        document.getElementById('dashNetWorth').innerText = this.fmt(netWorth);
        document.getElementById('dashIncome').innerText = this.fmt(totalIncome);
        document.getElementById('dashExpenses').innerText = this.fmt(totalExpenses + totalFamily);
        document.getElementById('dashSavings').innerText = this.fmt(netSavings);
        document.getElementById('dashInvestments').innerText = this.fmt(totalInvestedValue);
        document.getElementById('dashLoans').innerText = this.fmt(loansTaken);

        this.computeHealthScore(totalIncome, totalExpenses + totalFamily, loansTaken, netWorth);
    }

    computeHealthScore(income, outflow, debt, nw) {
        let score = 60;
        if (income > 0) {
            const savingsRate = (income - outflow) / income;
            score += Math.floor(savingsRate * 25);
        }
        if (debt > nw) score -= 25;
        score = Math.max(0, Math.min(100, score));
        
        const circle = document.getElementById('healthScoreCircle');
        if(circle) {
            circle.setAttribute('stroke-dasharray', `${score}, 100`);
            document.getElementById('healthScoreText').textContent = score;
            document.getElementById('healthMessage').textContent = score > 75 ? "Optimal Wealth Health" : score > 45 ? "Balanced Vector" : "Mitigation Required";
        }
    }

    renderRecentTransactions() {
        const tbody = document.getElementById('recentTransactionsTable');
        tbody.innerHTML = '';
        let pool = [
            ...this.db.income.map(i => ({...i, type: 'Income', css: 'text-success'})),
            ...this.db.expenses.map(e => ({...e, type: 'Expense', source: e.category, notes: e.description, css: 'text-danger'}))
        ];
        pool.sort((a,b) => new Date(b.date) - new Date(a.date));
        pool.slice(0, 5).forEach(item => {
            tbody.innerHTML += `<tr><td>${item.date}</td><td><span class="${item.css}">${item.type}</span></td><td>${item.source || item.category}</td><td>${this.fmt(item.amount)}</td><td>${item.notes || '--'}</td></tr>`;
        });
    }

    /* INC / EXP LOG MATRIX SETUP */
    renderIncomeLedger(filterMonth = '', searchTxt = '') {
        const tbody = document.getElementById('incomeTableBody');
        tbody.innerHTML = '';
        let data = this.db.income;
        if(filterMonth) data = data.filter(i => i.date.startsWith(filterMonth));
        if(searchTxt) data = data.filter(i => i.source.toLowerCase().includes(searchTxt.toLowerCase()));

        data.forEach((item, index) => {
            tbody.innerHTML += `<tr><td>${item.date}</td><td><strong>${item.source}</strong></td><td>${this.fmt(item.amount)}</td><td>${item.notes || '--'}</td><td><button class="btn-delete" onclick="app.deleteIncome(${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }

    deleteIncome(index) { this.db.income.splice(index, 1); this.saveDatabase(); }

    renderExpenseLedger(cat = '', month = '', search = '') {
        const tbody = document.getElementById('expenseTableBody');
        tbody.innerHTML = '';
        let data = this.db.expenses;
        if(cat) data = data.filter(e => e.category === cat);
        if(month) data = data.filter(e => e.date.startsWith(month));
        if(search) data = data.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));

        data.forEach((item, index) => {
            tbody.innerHTML += `<tr><td>${item.date}</td><td><span class="badge">${item.category}</span></td><td>${this.fmt(item.amount)}</td><td>${item.description || '--'}</td><td><button class="btn-delete" onclick="app.deleteExpense(${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }

    deleteExpense(index) { this.db.expenses.splice(index, 1); this.saveDatabase(); }

    /* PORTFOLIO & SIP SUBSYSTEMS */
    renderInvestmentSubsystem() {
        const sTbody = document.getElementById('stockTableBody'); sTbody.innerHTML = '';
        this.db.investments.stocks.forEach((item, index) => {
            const inv = item.qty * item.purchase; const cur = item.qty * item.current; const pl = cur - inv;
            sTbody.innerHTML += `<tr><td><strong>${item.name}</strong></td><td>${item.qty}</td><td>${this.fmt(item.purchase)}</td><td>${this.fmt(item.current)}</td><td>${this.fmt(inv)}</td><td>${this.fmt(cur)}</td><td class="${pl >= 0 ? 'text-success' : 'text-danger'}">${this.fmt(pl)}</td><td><button class="btn-delete" onclick="app.deleteAsset('stocks', ${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });

        const mfTbody = document.getElementById('mfTableBody'); mfTbody.innerHTML = '';
        this.db.investments.mf.forEach((item, index) => {
            const pl = item.current - item.invested;
            mfTbody.innerHTML += `<tr><td><strong>${item.name}</strong></td><td>${this.fmt(item.invested)}</td><td>${this.fmt(item.current)}</td><td class="${pl >= 0 ? 'text-success' : 'text-danger'}">${this.fmt(pl)}</td><td><button class="btn-delete" onclick="app.deleteAsset('mf', ${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });

        const sipTbody = document.getElementById('sipTableBody'); sipTbody.innerHTML = '';
        this.db.investments.sip.forEach((item, index) => {
            sipTbody.innerHTML += `<tr><td><strong>${item.name}</strong></td><td>${this.fmt(item.amount)}</td><td>${item.date}</td><td><button class="btn-delete" onclick="app.deleteAsset('sip', ${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });

        const sInv = this.db.investments.stocks.reduce((s,i)=>s+(i.qty*i.purchase),0) + this.db.investments.mf.reduce((s,i)=>s+Number(i.invested),0);
        const sCur = this.db.investments.stocks.reduce((s,i)=>s+(i.qty*i.current),0) + this.db.investments.mf.reduce((s,i)=>s+Number(i.current),0);
        document.getElementById('invTotalInvested').innerText = this.fmt(sInv);
        document.getElementById('invCurrentValue').innerText = this.fmt(sCur);
        document.getElementById('invNetReturn').innerText = this.fmt(sCur - sInv);
        document.getElementById('invNetReturn').className = (sCur - sInv >= 0) ? 'text-success' : 'text-danger';
    }

    deleteAsset(type, index) { this.db.investments[type].splice(index, 1); this.saveDatabase(); }

    renderLoanSubsystem() {
        const givenBody = document.getElementById('loansGivenTableBody'); const takenBody = document.getElementById('loansTakenTableBody');
        givenBody.innerHTML = ''; takenBody.innerHTML = '';
        this.db.loans.forEach((item, index) => {
            if (item.type === 'Given') {
                givenBody.innerHTML += `<tr><td><strong>${item.party}</strong></td><td>${this.fmt(item.amount)}</td><td>${item.date}</td><td>Active Receivable</td><td>${item.notes || '--'}</td><td><button class="btn-delete" onclick="app.deleteLoan(${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
            } else {
                takenBody.innerHTML += `<tr><td><strong>${item.party}</strong></td><td>${this.fmt(item.amount)}</td><td>${item.rate}%</td><td>${this.fmt(item.amount)}</td><td>${item.date}</td><td><button class="btn-delete" onclick="app.deleteLoan(${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
            }
        });
    }
    deleteLoan(index) { this.db.loans.splice(index, 1); this.saveDatabase(); }

    renderFamilySubsystem() {
        const tbody = document.getElementById('familyTableBody'); tbody.innerHTML = '';
        const currentMonth = new Date().toISOString().slice(0,7);
        let mTotal = 0, yTotal = 0;

        this.db.family.forEach((item, index) => {
            const amt = Number(item.amount);
            if(item.date.startsWith(currentMonth)) mTotal += amt;
            yTotal += amt;
            tbody.innerHTML += `<tr><td>${item.date}</td><td>${this.fmt(amt)}</td><td><strong>${item.purpose}</strong></td><td>${item.notes || '--'}</td><td><button class="btn-delete" onclick="app.deleteFamily(${index})"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
        document.getElementById('familyMonthTotal').innerText = this.fmt(mTotal);
        document.getElementById('familyYearTotal').innerText = this.fmt(yTotal);
    }
    deleteFamily(index) { this.db.family.splice(index, 1); this.saveDatabase(); }

    renderBudgetEnforcements() {
        const container = document.getElementById('budgetContainer'); container.innerHTML = '';
        const currentMonth = new Date().toISOString().slice(0,7);
        Object.keys(this.db.budgets).forEach(cat => {
            const allowed = this.db.budgets[cat];
            const spent = this.db.expenses.filter(e => e.category === cat && e.date.startsWith(currentMonth)).reduce((sum, e) => sum + Number(e.amount), 0);
            const pct = allowed > 0 ? Math.min(100, Math.floor((spent / allowed) * 100)) : 0;
            container.innerHTML += `
                <div class="glass-panel progress-card">
                    <div class="progress-header"><span>${cat}</span><span class="${spent>allowed?'text-danger':''}">${this.fmt(spent)} / ${this.fmt(allowed)}</span></div>
                    <div class="progress-track"><div class="progress-fill ${spent>allowed?'danger-alert':Simple}" style="width: ${pct}%"></div></div>
                </div>`;
        });
    }

    renderGoalsStructure() {
        const container = document.getElementById('goalsContainer'); container.innerHTML = '';
        this.db.goals.forEach((goal, index) => {
            const pct = Math.min(100, Math.floor((goal.saved / goal.target) * 100));
            container.innerHTML += `
                <div class="glass-panel progress-card">
                    <div class="progress-header"><strong>${goal.category}</strong><span>${pct}%</span></div>
                    <div class="progress-track"><div class="progress-fill" style="width: ${pct}%"></div></div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);"><span>Saved: ${this.fmt(goal.saved)}</span><span>Target: ${this.fmt(goal.target)}</span></div>
                    <div class="action-btns" style="justify-content:flex-end; margin-top:0.5rem;"><button class="btn-delete" onclick="app.deleteGoal(${index})"><i class="fa-solid fa-trash"></i></button></div>
                </div>`;
        });
    }
    deleteGoal(index) { this.db.goals.splice(index, 1); this.saveDatabase(); }

    /* CHART GENERATORS */
    renderCharts() {
        const ctxMini = document.getElementById('miniPieChart');
        if (ctxMini) {
            if(this.charts.mini) this.charts.mini.destroy();
            this.charts.mini = new Chart(ctxMini, {
                type: 'doughnut',
                data: {
                    labels: ['Inflows', 'Outflows'],
                    datasets: [{ data: [this.db.income.reduce((s,i)=>s+Number(i.amount),0), this.db.expenses.reduce((s,e)=>s+Number(e.amount),0)], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]
                },
                options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
            });
        }
    }

    /* INDIAN EMI AND SIP COMPREHENSIVE MATHS */
    calcEMI() {
        const p = Number(document.getElementById('emiPrincipal').value);
        const r = Number(document.getElementById('emiRate').value) / 12 / 100;
        const n = Number(document.getElementById('emiTenure').value);
        const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        document.getElementById('emiResult').innerText = `EMI: ${isNaN(emi) ? '--' : this.fmt(Math.round(emi))}/Month`;
    }

    calcSIP() {
        const p = Number(document.getElementById('sipAmount').value);
        const r = Number(document.getElementById('sipRate').value) / 12 / 100;
        const n = Number(document.getElementById('sipYears').value) * 12;
        const estValue = p * [ (Math.pow(1 + r, n) - 1) / r ] * (1 + r);
        document.getElementById('sipResult').innerText = `Future Worth: ${isNaN(estValue) ? '--' : this.fmt(Math.round(estValue))}`;
    }

    /* GLOBAL REGISTRATION POPUPS ENGINE */
    registerModalTriggers() {
        document.querySelectorAll('.open-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => document.getElementById(btn.getAttribute('data-modal')).classList.add('active'));
        });
        document.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.modal-overlay').classList.remove('active'));
        });
    }

    registerFormSubmissions() {
        document.getElementById('incomeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.income.push({ date: document.getElementById('incomeDate').value, source: document.getElementById('incomeSource').value, amount: Number(document.getElementById('incomeAmount').value), notes: document.getElementById('incomeNotes').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('incomeModal').classList.remove('active');
        });

        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.expenses.push({ date: document.getElementById('expenseDate').value, category: document.getElementById('expenseCategory').value, amount: Number(document.getElementById('expenseAmount').value), description: document.getElementById('expenseDescription').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('expenseModal').classList.remove('active');
        });

        document.getElementById('stockForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.investments.stocks.push({ name: document.getElementById('stockName').value.toUpperCase(), qty: Number(document.getElementById('stockQty').value), purchase: Number(document.getElementById('stockPurchase').value), current: Number(document.getElementById('stockCurrent').value), date: document.getElementById('stockDate').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('stockModal').classList.remove('active');
        });

        document.getElementById('mfForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.investments.mf.push({ name: document.getElementById('mfName').value, invested: Number(document.getElementById('mfInvested').value), current: Number(document.getElementById('mfCurrent').value) });
            this.saveDatabase(); e.target.reset(); document.getElementById('mfModal').classList.remove('active');
        });

        document.getElementById('sipForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.investments.sip.push({ name: document.getElementById('sipName').value, amount: Number(document.getElementById('sipAmountField').value), date: document.getElementById('sipDate').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('sipModal').classList.remove('active');
        });

        document.getElementById('loanForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.loans.push({ type: document.getElementById('loanType').value, party: document.getElementById('loanParty').value, amount: Number(document.getElementById('loanAmount').value), rate: Number(document.getElementById('loanRate').value), date: document.getElementById('loanDate').value, notes: document.getElementById('loanNotes').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('loanModal').classList.remove('active');
        });

        document.getElementById('familyForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.family.push({ date: document.getElementById('familyDate').value, amount: Number(document.getElementById('familyAmount').value), purpose: document.getElementById('familyPurpose').value, notes: document.getElementById('familyNotes').value });
            this.saveDatabase(); e.target.reset(); document.getElementById('familyModal').classList.remove('active');
        });

        document.getElementById('budgetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.budgets.Food = Number(document.getElementById('bFood').value);
            this.db.budgets.Rent = Number(document.getElementById('bRent').value);
            this.db.budgets.Transport = Number(document.getElementById('bTransport').value);
            this.db.budgets.Shopping = Number(document.getElementById('bShopping').value);
            this.db.budgets.Entertainment = Number(document.getElementById('bEntertainment').value);
            this.db.budgets.Others = Number(document.getElementById('bOthers').value);
            this.saveDatabase(); document.getElementById('budgetModal').classList.remove('active');
        });

        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.db.goals.push({ category: document.getElementById('goalCategory').value, target: Number(document.getElementById('goalTarget').value), saved: Number(document.getElementById('goalSaved').value) });
            this.saveDatabase(); e.target.reset(); document.getElementById('goalModal').classList.remove('active');
        });
    }

    registerSearchAndFilters() {
        document.getElementById('incomeMonthFilter').addEventListener('input', (e) => this.renderIncomeLedger(e.target.value, document.getElementById('incomeSearch').value));
        document.getElementById('incomeSearch').addEventListener('input', (e) => this.renderIncomeLedger(document.getElementById('incomeMonthFilter').value, e.target.value));
        document.getElementById('globalSearch').addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if(val) { this.renderIncomeLedger('', val); this.renderExpenseLedger('', '', val); } else { this.refreshAllUIStructures(); }
        });
    }

    clearIncomeFilters() { document.getElementById('incomeMonthFilter').value = ''; document.getElementById('incomeSearch').value = ''; this.renderIncomeLedger(); }
    clearExpenseFilters() { document.getElementById('expenseCategoryFilter').value = ''; document.getElementById('expenseMonthFilter').value = ''; document.getElementById('expenseSearch').value = ''; this.renderExpenseLedger(); }

    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.db));
        const dlAnchor = document.createElement('a'); dlAnchor.setAttribute("href", dataStr); dlAnchor.setAttribute("download", "rupeeflow_backup.json"); dlAnchor.click();
    }

    importData(event) {
        const reader = new FileReader();
        reader.onload = (e) => { try { this.db = JSON.parse(e.target.result); this.saveDatabase(); alert("Database integrated successfully."); } catch(err) { alert("Invalid backup structure."); } };
        reader.readAsText(event.target.files[0]);
    }

    resetData() { if(confirm("Permanently wipe database records?")) { localStorage.removeItem(this.storageKey); location.reload(); } }

    /**
     * DOMESTIC INDIAN NUMBER FORMATTER COEFFICIENT (Lakh/Crore Layout Regex)
     */
    fmt(val) {
        const x = Math.round(val).toString();
        let lastThree = x.substring(x.length - 3);
        const otherBits = x.substring(0, x.length - 3);
        if (otherBits !== '') lastThree = ',' + lastThree;
        const res = otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
        return '₹' + res;
    }
}

const app = new RupeeFlowApp();