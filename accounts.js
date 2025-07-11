// Accounts management functionality for Arabic RTL Order Management System

let currentExpenses = [];
let currentSavings = [];
let currentReminders = [];
let currentOrders = [];
let currentDeliveredOrders = [];
let currentClients = [];
let accountStatistics = {
    totalRevenue: 0,
    pendingCollection: 0,
    totalExpenses: 0,
    netProfit: 0,
    wholesaleClientsCount: 0,
    retailClientsCount: 0,
    wholesaleCreditTotal: 0,
    retailCreditTotal: 0,
    readyOrdersCount: 0,
    readyOrdersValue: 0,
    pendingOrdersCount: 0,
    pendingOrdersValue: 0
};

document.addEventListener('DOMContentLoaded', async function() {
    initializeAccountsPage();
    await loadAllData();
    calculateStatistics();
    updateFinancialSummary();
    await loadExpenses();
    await loadSavings();
    await loadReminders();
    checkOverdueItems();
    setupEventListeners();
});

function initializeAccountsPage() {
    // Set default date range to current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dateFrom').value = formatDateForInput(firstDayOfMonth);
    document.getElementById('dateTo').value = formatDateForInput(today);
    
    console.log('Accounts page initialized');
}

async function loadAllData() {
    try {
        currentOrders = await databaseStorage.getOrders();
        currentDeliveredOrders = await databaseStorage.getDeliveredOrders();
        currentClients = await databaseStorage.getClients();
        currentExpenses = await databaseStorage.getExpenses();
        currentSavings = await databaseStorage.getSavings();
        currentReminders = await databaseStorage.getReminders();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
}

function setDateRange(period) {
    const range = getDateRange(period);
    document.getElementById('dateFrom').value = range.start;
    document.getElementById('dateTo').value = range.end;
    
    calculateStatistics();
    updateFinancialSummary();
}

function calculateStatistics() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    // Filter delivered orders by date range
    const filteredDeliveredOrders = currentDeliveredOrders.filter(order => {
        const deliveryDate = order.deliveredAt ? order.deliveredAt.split('T')[0] : '';
        return isDateInRange(deliveryDate, dateFrom, dateTo);
    });
    
    // Calculate revenue
    accountStatistics.totalRevenue = filteredDeliveredOrders.reduce((sum, order) => 
        sum + (parseFloat(order.paidAmount) || 0), 0
    );
    
    // Calculate pending collection
    accountStatistics.pendingCollection = currentClients.reduce((sum, client) => 
        sum + (parseFloat(client.balance) || 0), 0
    );
    
    // Filter expenses by date range
    const filteredExpenses = currentExpenses.filter(expense => {
        const expenseDate = expense.date;
        return isDateInRange(expenseDate, dateFrom, dateTo);
    });
    
    // Calculate expenses
    accountStatistics.totalExpenses = filteredExpenses.reduce((sum, expense) => 
        sum + (parseFloat(expense.amount) || 0), 0
    );
    
    // Calculate net profit
    accountStatistics.netProfit = accountStatistics.totalRevenue - accountStatistics.totalExpenses;
    
    // Client statistics
    const wholesaleClients = currentClients.filter(c => c.type === 'wholesale');
    const retailClients = currentClients.filter(c => c.type === 'retail');
    
    accountStatistics.wholesaleClientsCount = wholesaleClients.length;
    accountStatistics.retailClientsCount = retailClients.length;
    accountStatistics.wholesaleCreditTotal = wholesaleClients.reduce((sum, client) => 
        sum + (parseFloat(client.balance) || 0), 0
    );
    accountStatistics.retailCreditTotal = retailClients.reduce((sum, client) => 
        sum + (parseFloat(client.balance) || 0), 0
    );
    
    // Orders statistics
    const readyOrders = currentOrders.filter(o => o.status === 'ready');
    const pendingOrders = currentOrders.filter(o => o.status === 'pending');
    
    accountStatistics.readyOrdersCount = readyOrders.length;
    accountStatistics.readyOrdersValue = readyOrders.reduce((sum, order) => 
        sum + (parseFloat(order.total) || 0), 0
    );
    accountStatistics.pendingOrdersCount = pendingOrders.length;
    accountStatistics.pendingOrdersValue = pendingOrders.reduce((sum, order) => 
        sum + (parseFloat(order.total) || 0), 0
    );
}

function updateFinancialSummary() {
    // Update main financial cards
    document.getElementById('totalRevenue').textContent = formatCurrency(accountStatistics.totalRevenue);
    document.getElementById('pendingCollection').textContent = formatCurrency(accountStatistics.pendingCollection);
    document.getElementById('totalExpenses').textContent = formatCurrency(accountStatistics.totalExpenses);
    document.getElementById('netProfit').textContent = formatCurrency(accountStatistics.netProfit);
    
    // Update revenue details
    const revenueDetails = document.getElementById('revenueDetails');
    if (revenueDetails) {
        const deliveredCount = currentDeliveredOrders.length;
        revenueDetails.textContent = `من ${deliveredCount} طلب مسلم`;
    }
    
    // Update pending details
    const pendingDetails = document.getElementById('pendingDetails');
    if (pendingDetails) {
        const clientsWithCredit = currentClients.filter(c => (c.balance || 0) > 0).length;
        pendingDetails.textContent = `من ${clientsWithCredit} عميل`;
    }
    
    // Update expense details
    const expenseDetails = document.getElementById('expenseDetails');
    if (expenseDetails) {
        expenseDetails.textContent = `من ${currentExpenses.length} مصروف`;
    }
    
    // Update profit margin
    const profitMargin = document.getElementById('profitMargin');
    if (profitMargin && accountStatistics.totalRevenue > 0) {
        const margin = ((accountStatistics.netProfit / accountStatistics.totalRevenue) * 100).toFixed(1);
        profitMargin.textContent = `${margin}%`;
    }
    
    // Update client credit summary
    document.getElementById('wholesaleClientsCount').textContent = accountStatistics.wholesaleClientsCount;
    document.getElementById('retailClientsCount').textContent = accountStatistics.retailClientsCount;
    document.getElementById('wholesaleCreditTotal').textContent = formatCurrency(accountStatistics.wholesaleCreditTotal);
    document.getElementById('retailCreditTotal').textContent = formatCurrency(accountStatistics.retailCreditTotal);
    
    // Update orders status
    document.getElementById('readyOrdersCount').textContent = accountStatistics.readyOrdersCount;
    document.getElementById('readyOrdersValue').textContent = formatCurrency(accountStatistics.readyOrdersValue);
    document.getElementById('pendingOrdersCount').textContent = accountStatistics.pendingOrdersCount;
    document.getElementById('pendingOrdersValue').textContent = formatCurrency(accountStatistics.pendingOrdersValue);
}

async function loadExpenses() {
    const tableBody = document.getElementById('expensesTable');
    
    if (currentExpenses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-receipt me-2"></i>
                    لا توجد مصروفات مسجلة
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort expenses by date (newest first)
    const sortedExpenses = [...currentExpenses].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    let html = '';
    sortedExpenses.forEach(expense => {
        html += `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>${sanitizeInput(expense.description)}</td>
                <td>
                    <span class="badge bg-secondary">${sanitizeInput(expense.category)}</span>
                </td>
                <td class="text-currency">${formatCurrency(expense.amount)}</td>
                <td>${getPaymentMethodName(expense.paymentMethod)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editExpense('${expense.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${expense.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

async function loadSavings() {
    const tableBody = document.getElementById('savingsTable');
    
    if (currentSavings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-piggy-bank me-2"></i>
                    لا توجد كروت ادخار
                </td>
            </tr>
        `;
        updateSavingsTotals();
        return;
    }
    
    // Sort savings by date (newest first)
    const sortedSavings = [...currentSavings].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    let html = '';
    sortedSavings.forEach(saving => {
        const statusClass = saving.status === 'active' ? 'bg-success' : 'bg-secondary';
        const statusText = saving.status === 'active' ? 'نشط' : 'مكتمل';
        
        html += `
            <tr>
                <td>${sanitizeInput(saving.name)}</td>
                <td>
                    <span class="badge bg-info">${getSavingsTypeName(saving.type)}</span>
                </td>
                <td class="text-currency">${formatCurrency(saving.amount)}</td>
                <td>${formatDate(saving.date)}</td>
                <td>
                    <span class="badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="editSavings('${saving.id}')" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${saving.status === 'active' ? 
                            `<button class="btn btn-sm btn-outline-success" onclick="completeSavings('${saving.id}')" title="إتمام">
                                <i class="fas fa-check"></i>
                            </button>` : ''
                        }
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteSavings('${saving.id}')" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    updateSavingsTotals();
}

function updateSavingsTotals() {
    const jamiaTotal = currentSavings
        .filter(s => s.type === 'جمعية' && s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
    
    const installmentsTotal = currentSavings
        .filter(s => s.type === 'قسط' && s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
    
    const paymentsTotal = currentSavings
        .filter(s => s.type === 'دفعة' && s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0);
    
    document.getElementById('jamiaTotal').textContent = formatCurrency(jamiaTotal);
    document.getElementById('installmentsTotal').textContent = formatCurrency(installmentsTotal);
    document.getElementById('paymentsTotal').textContent = formatCurrency(paymentsTotal);
}

function getSavingsTypeName(type) {
    const types = {
        'جمعية': 'جمعية',
        'قسط': 'قسط',
        'دفعة': 'دفعة'
    };
    return types[type] || type;
}

async function loadReminders() {
    // This function would load and display reminders
    // For now, we'll just check for overdue items
    checkOverdueItems();
}

function checkOverdueItems() {
    const today = new Date();
    const overdueOrders = currentOrders.filter(order => {
        const deliveryDate = new Date(order.deliveryDate);
        return deliveryDate < today && order.status !== 'delivered';
    });
    
    const dueReminders = currentReminders.filter(reminder => {
        const reminderDate = new Date(reminder.date);
        return reminderDate <= today && reminder.status === 'active';
    });
    
    // Update overdue orders display
    const overdueOrdersDiv = document.getElementById('overdueOrders');
    if (overdueOrders.length > 0) {
        overdueOrdersDiv.className = 'alert alert-warning';
        overdueOrdersDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            لديك ${overdueOrders.length} طلب متأخر عن موعد التسليم
        `;
    } else {
        overdueOrdersDiv.className = 'alert alert-success';
        overdueOrdersDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            لا توجد طلبات متأخرة
        `;
    }
    
    // Update due reminders display
    const dueRemindersDiv = document.getElementById('dueReminders');
    if (dueReminders.length > 0) {
        dueRemindersDiv.className = 'alert alert-warning';
        dueRemindersDiv.innerHTML = `
            <i class="fas fa-bell me-2"></i>
            لديك ${dueReminders.length} تذكير مستحق
        `;
    } else {
        dueRemindersDiv.className = 'alert alert-info';
        dueRemindersDiv.innerHTML = `
            <i class="fas fa-bell me-2"></i>
            لا توجد تذكيرات مستحقة
        `;
    }
}

function showAddExpenseModal() {
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    
    // Clear form
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseDate').value = getTodayDate();
    
    modal.show();
}

async function saveExpense() {
    const form = document.getElementById('expenseForm');
    
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const description = document.getElementById('expenseDescription').value.trim();
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const paymentMethod = document.getElementById('expensePaymentMethod').value;
    const notes = document.getElementById('expenseNotes').value.trim();
    
    if (amount <= 0) {
        showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
        return;
    }
    
    const expense = {
        description: description,
        category: category,
        amount: amount,
        date: date,
        paymentMethod: paymentMethod,
        notes: notes
    };
    
    try {
        await databaseStorage.addExpense(expense);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        await loadAllData();
        calculateStatistics();
        updateFinancialSummary();
        await loadExpenses();
        showNotification('تم إضافة المصروف بنجاح', 'success');
        
    } catch (error) {
        console.error('Error adding expense:', error);
        showNotification('خطأ في إضافة المصروف', 'error');
    }
}

function editExpense(expenseId) {
    const expense = currentExpenses.find(e => e.id === expenseId);
    if (!expense) {
        showNotification('المصروف غير موجود', 'error');
        return;
    }
    
    // Populate form
    document.getElementById('expenseDescription').value = expense.description;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('expensePaymentMethod').value = expense.paymentMethod;
    document.getElementById('expenseNotes').value = expense.notes || '';
    
    // Store ID for update
    document.getElementById('expenseForm').dataset.editingId = expenseId;
    
    const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
    modal.show();
    
    // Update modal title
    document.querySelector('#addExpenseModal .modal-title').textContent = 'تعديل المصروف';
}

function deleteExpense(expenseId) {
    confirmDialog('هل أنت متأكد من حذف هذا المصروف؟', async () => {
        try {
            await databaseStorage.deleteExpense(expenseId);
            
            await loadAllData();
            calculateStatistics();
            updateFinancialSummary();
            await loadExpenses();
            showNotification('تم حذف المصروف بنجاح', 'success');
            
        } catch (error) {
            console.error('Error deleting expense:', error);
            showNotification('خطأ في حذف المصروف', 'error');
        }
    });
}

function showSavingsModal() {
    const modal = new bootstrap.Modal(document.getElementById('savingsModal'));
    
    // Clear form
    document.getElementById('savingsForm').reset();
    document.getElementById('savingsDate').value = getTodayDate();
    
    modal.show();
}

async function saveSavings() {
    const form = document.getElementById('savingsForm');
    
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const name = document.getElementById('savingsName').value.trim();
    const type = document.getElementById('savingsType').value;
    const amount = parseFloat(document.getElementById('savingsAmount').value);
    const date = document.getElementById('savingsDate').value;
    const description = document.getElementById('savingsDescription').value.trim();
    
    if (amount <= 0) {
        showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
        return;
    }
    
    const savings = {
        name: name,
        type: type,
        amount: amount,
        date: date,
        description: description,
        status: 'active'
    };
    
    try {
        await databaseStorage.addSavings(savings);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('savingsModal'));
        modal.hide();
        
        await loadAllData();
        await loadSavings();
        showNotification('تم إضافة كرت الادخار بنجاح', 'success');
        
    } catch (error) {
        console.error('Error adding savings:', error);
        showNotification('خطأ في إضافة كرت الادخار', 'error');
    }
}

function editSavings(savingsId) {
    const savings = currentSavings.find(s => s.id === savingsId);
    if (!savings) {
        showNotification('كرت الادخار غير موجود', 'error');
        return;
    }
    
    // Populate form
    document.getElementById('savingsName').value = savings.name;
    document.getElementById('savingsType').value = savings.type;
    document.getElementById('savingsAmount').value = savings.amount;
    document.getElementById('savingsDate').value = savings.date;
    document.getElementById('savingsDescription').value = savings.description || '';
    
    // Store ID for update
    document.getElementById('savingsForm').dataset.editingId = savingsId;
    
    const modal = new bootstrap.Modal(document.getElementById('savingsModal'));
    modal.show();
    
    // Update modal title
    document.querySelector('#savingsModal .modal-title').textContent = 'تعديل كرت الادخار';
}

function completeSavings(savingsId) {
    confirmDialog('هل أنت متأكد من إتمام كرت الادخار؟', async () => {
        try {
            await databaseStorage.updateSavings(savingsId, { status: 'completed' });
            
            await loadAllData();
            await loadSavings();
            showNotification('تم إتمام كرت الادخار', 'success');
            
        } catch (error) {
            console.error('Error completing savings:', error);
            showNotification('خطأ في إتمام كرت الادخار', 'error');
        }
    });
}

function deleteSavings(savingsId) {
    confirmDialog('هل أنت متأكد من حذف كرت الادخار؟', async () => {
        try {
            await databaseStorage.deleteSavings(savingsId);
            
            await loadAllData();
            await loadSavings();
            showNotification('تم حذف كرت الادخار بنجاح', 'success');
            
        } catch (error) {
            console.error('Error deleting savings:', error);
            showNotification('خطأ في حذف كرت الادخار', 'error');
        }
    });
}

function showReminderModal() {
    const modal = new bootstrap.Modal(document.getElementById('reminderModal'));
    
    // Clear form
    document.getElementById('reminderForm').reset();
    document.getElementById('reminderDate').value = getTodayDate();
    
    modal.show();
}

async function saveReminder() {
    const form = document.getElementById('reminderForm');
    
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const title = document.getElementById('reminderTitle').value.trim();
    const date = document.getElementById('reminderDate').value;
    const type = document.getElementById('reminderType').value;
    const description = document.getElementById('reminderDescription').value.trim();
    
    const reminder = {
        title: title,
        date: date,
        type: type,
        description: description,
        status: 'active'
    };
    
    try {
        await databaseStorage.addReminder(reminder);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('reminderModal'));
        modal.hide();
        
        await loadAllData();
        checkOverdueItems();
        showNotification('تم إضافة التذكير بنجاح', 'success');
        
    } catch (error) {
        console.error('Error adding reminder:', error);
        showNotification('خطأ في إضافة التذكير', 'error');
    }
}

function exportExpenses() {
    try {
        if (currentExpenses.length === 0) {
            showNotification('لا توجد مصروفات للتصدير', 'warning');
            return;
        }
        
        const exportData = currentExpenses.map(expense => ({
            'التاريخ': formatDate(expense.date),
            'الوصف': expense.description,
            'الفئة': expense.category,
            'المبلغ': expense.amount,
            'طريقة الدفع': getPaymentMethodName(expense.paymentMethod),
            'ملاحظات': expense.notes || ''
        }));
        
        const headers = ['التاريخ', 'الوصف', 'الفئة', 'المبلغ', 'طريقة الدفع', 'ملاحظات'];
        
        exportToCSV(exportData, 'المصروفات', headers);
        
    } catch (error) {
        console.error('Error exporting expenses:', error);
        showNotification('خطأ في تصدير المصروفات', 'error');
    }
}

function refreshExpenses() {
    loadAllData();
    calculateStatistics();
    updateFinancialSummary();
    loadExpenses();
    loadSavings();
    checkOverdueItems();
    showNotification('تم تحديث البيانات', 'info');
}

function setupEventListeners() {
    // Date range change handlers
    document.getElementById('dateFrom').addEventListener('change', () => {
        calculateStatistics();
        updateFinancialSummary();
    });
    
    document.getElementById('dateTo').addEventListener('change', () => {
        calculateStatistics();
        updateFinancialSummary();
    });
    
    // Expense form submission
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const editingId = e.target.dataset.editingId;
        if (editingId) {
            updateExistingExpense(editingId);
        } else {
            saveExpense();
        }
    });
    
    // Savings form submission
    document.getElementById('savingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const editingId = e.target.dataset.editingId;
        if (editingId) {
            updateExistingSavings(editingId);
        } else {
            saveSavings();
        }
    });
    
    // Reminder form submission
    document.getElementById('reminderForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveReminder();
    });
    
    // Reset forms when modals are hidden
    document.getElementById('addExpenseModal').addEventListener('hidden.bs.modal', function() {
        this.querySelector('form').reset();
        delete this.querySelector('form').dataset.editingId;
        this.querySelector('.modal-title').textContent = 'إضافة مصروف جديد';
    });
    
    document.getElementById('savingsModal').addEventListener('hidden.bs.modal', function() {
        this.querySelector('form').reset();
        delete this.querySelector('form').dataset.editingId;
        this.querySelector('.modal-title').textContent = 'إضافة كرت ادخار';
    });
}

async function updateExistingExpense(expenseId) {
    const form = document.getElementById('expenseForm');
    
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const description = document.getElementById('expenseDescription').value.trim();
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const paymentMethod = document.getElementById('expensePaymentMethod').value;
    const notes = document.getElementById('expenseNotes').value.trim();
    
    if (amount <= 0) {
        showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
        return;
    }
    
    const updates = {
        description: description,
        category: category,
        amount: amount,
        date: date,
        paymentMethod: paymentMethod,
        notes: notes
    };
    
    try {
        await databaseStorage.updateExpense(expenseId, updates);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        
        await loadAllData();
        calculateStatistics();
        updateFinancialSummary();
        await loadExpenses();
        showNotification('تم تحديث المصروف بنجاح', 'success');
        
    } catch (error) {
        console.error('Error updating expense:', error);
        showNotification('خطأ في تحديث المصروف', 'error');
    }
}

async function updateExistingSavings(savingsId) {
    const form = document.getElementById('savingsForm');
    
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const name = document.getElementById('savingsName').value.trim();
    const type = document.getElementById('savingsType').value;
    const amount = parseFloat(document.getElementById('savingsAmount').value);
    const date = document.getElementById('savingsDate').value;
    const description = document.getElementById('savingsDescription').value.trim();
    
    if (amount <= 0) {
        showNotification('المبلغ يجب أن يكون أكبر من صفر', 'warning');
        return;
    }
    
    const updates = {
        name: name,
        type: type,
        amount: amount,
        date: date,
        description: description
    };
    
    try {
        await databaseStorage.updateSavings(savingsId, updates);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('savingsModal'));
        modal.hide();
        
        await loadAllData();
        await loadSavings();
        showNotification('تم تحديث كرت الادخار بنجاح', 'success');
        
    } catch (error) {
        console.error('Error updating savings:', error);
        showNotification('خطأ في تحديث كرت الادخار', 'error');
    }
}
