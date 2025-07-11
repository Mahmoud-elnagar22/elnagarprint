// Utility functions for Arabic RTL Order Management System

/**
 * Format currency in Egyptian Pounds
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00 ج.م';
    }
    return parseFloat(amount).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' ج.م';
}

/**
 * Format date in Arabic format
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDateForInput(date) {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} - Today's date
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 * @returns {string} - Tomorrow's date
 */
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Generate unique ID
 * @returns {string} - Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/**
 * Show loading spinner
 * @param {string} containerId - Container element ID
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner"></div>
                <p class="mt-2">جاري التحميل...</p>
            </div>
        `;
    }
}

/**
 * Hide loading spinner
 * @param {string} containerId - Container element ID
 */
function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

/**
 * Validate Egyptian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function validatePhone(phone) {
    if (!phone) return false;
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid Egyptian phone number
    // Mobile: 01xxxxxxxxx (11 digits)
    // Landline: 0xxxxxxxxx (9-10 digits)
    return /^01[0-9]{9}$/.test(cleanPhone) || /^0[2-9][0-9]{7,8}$/.test(cleanPhone);
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
    if (!email) return true; // Email is optional
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (!input) return '';
    
    return input.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Calculate order total with discount
 * @param {number} price - Item price
 * @param {number} quantity - Item quantity
 * @param {number} discount - Discount percentage
 * @returns {number} - Total after discount
 */
function calculateTotal(price, quantity, discount = 0) {
    const subtotal = price * quantity;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
}

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {string} filename - Filename for export
 * @param {Array} headers - CSV headers
 */
function exportToCSV(data, filename, headers) {
    if (!data || data.length === 0) {
        showNotification('لا توجد بيانات للتصدير', 'warning');
        return;
    }
    
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility with Arabic text
    
    // Add headers
    if (headers && headers.length > 0) {
        const escapedHeaders = headers.map(header => escapeCSVValue(header));
        csvContent += escapedHeaders.join(',') + '\n';
    }
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            return escapeCSVValue(value);
        });
        csvContent += values.join(',') + '\n';
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${getTodayDate()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    showNotification('تم تصدير البيانات بنجاح', 'success');
}

/**
 * Escape CSV value with proper quote handling
 * @param {any} value - Value to escape
 * @returns {string} - Escaped CSV value
 */
function escapeCSVValue(value) {
    if (value === null || value === undefined) {
        return '""';
    }
    
    const stringValue = value.toString();
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

/**
 * Import data from CSV
 * @param {File} file - CSV file to import
 * @param {Function} callback - Callback function to handle imported data
 */
function importFromCSV(file, callback) {
    if (!file) {
        showNotification('لم يتم اختيار ملف', 'warning');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showNotification('يجب اختيار ملف CSV', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const data = parseCSV(csvData);
            
            if (data.length === 0) {
                showNotification('الملف فارغ أو غير صالح', 'error');
                return;
            }
            
            callback(data);
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            showNotification('خطأ في استيراد البيانات - تأكد من صحة تنسيق الملف', 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('خطأ في قراءة الملف', 'error');
    };
    
    // Try UTF-8 first, then fallback to other encodings
    reader.readAsText(file, 'UTF-8');
}

/**
 * Parse CSV data with proper handling of quotes and Arabic text
 * @param {string} csvData - Raw CSV data
 * @returns {Array} - Parsed data array
 */
function parseCSV(csvData) {
    const lines = csvData.split(/\r?\n/);
    const data = [];
    
    if (lines.length < 2) {
        throw new Error('Invalid CSV format');
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    
    // Parse data lines
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            try {
                const values = parseCSVLine(line);
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                data.push(row);
            } catch (error) {
                console.warn(`Error parsing line ${i + 1}: ${line}`);
            }
        }
    }
    
    return data;
}

/**
 * Parse a single CSV line with proper quote handling
 * @param {string} line - CSV line
 * @returns {Array} - Parsed values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // End of value
            values.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    // Add the last value
    values.push(current.trim());
    
    return values;
}

/**
 * Print element content
 * @param {string} elementId - Element ID to print
 * @param {string} title - Print title
 */
function printElement(elementId, title = 'طباعة') {
    const element = document.getElementById(elementId);
    if (!element) {
        showNotification('عنصر الطباعة غير موجود', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                .table th { background-color: #f2f2f2; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            ${element.innerHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

/**
 * Confirm dialog with Arabic text
 * @param {string} message - Confirmation message
 * @param {Function} callback - Callback function
 */
function confirmDialog(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
}

/**
 * Get date range based on period
 * @param {string} period - Period type (today, week, month)
 * @returns {Object} - Date range object
 */
function getDateRange(period) {
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    
    switch (period) {
        case 'today':
            break;
        case 'week':
            startDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(today.getMonth() - 1);
            break;
        default:
            break;
    }
    
    return {
        start: formatDateForInput(startDate),
        end: formatDateForInput(endDate)
    };
}

/**
 * Check if date is within range
 * @param {string} date - Date to check
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {boolean} - True if within range
 */
function isDateInRange(date, startDate, endDate) {
    if (!date) return false;
    
    const checkDate = new Date(date);
    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
    const end = endDate ? new Date(endDate) : new Date('2100-12-31');
    
    return checkDate >= start && checkDate <= end;
}

/**
 * Get payment method display name
 * @param {string} method - Payment method code
 * @returns {string} - Display name
 */
function getPaymentMethodName(method) {
    const methods = {
        'cash': 'نقدي',
        'credit': 'آجل',
        'vodafone': 'فودافون كاش',
        'bank': 'بنكي'
    };
    return methods[method] || method;
}

/**
 * Get customer type display name
 * @param {string} type - Customer type code
 * @returns {string} - Display name
 */
function getCustomerTypeName(type) {
    const types = {
        'wholesale': 'جملة',
        'retail': 'قطاعي'
    };
    return types[type] || type;
}

/**
 * Get order status display name
 * @param {string} status - Order status code
 * @returns {string} - Display name
 */
function getOrderStatusName(status) {
    const statuses = {
        'pending': 'معلق',
        'ready': 'جاهز',
        'delivered': 'مسلم',
        'cancelled': 'ملغي'
    };
    return statuses[status] || status;
}

/**
 * Validate required fields in form
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} - True if all required fields are filled
 */
function validateRequiredFields(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        const value = field.value.trim();
        
        if (!value) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        }
    });
    
    return isValid;
}

/**
 * Clear form validation states
 * @param {HTMLFormElement} form - Form element
 */
function clearValidation(form) {
    const fields = form.querySelectorAll('.is-invalid, .is-valid');
    fields.forEach(field => {
        field.classList.remove('is-invalid', 'is-valid');
    });
}

/**
 * Format phone number for display
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
function formatPhone(phone) {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Format mobile numbers (01xxxxxxxxx)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
        return cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    // Format landline numbers
    if (cleanPhone.length >= 9) {
        return cleanPhone.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    return phone;
}

/**
 * Get category color class
 * @param {string} category - Category name
 * @returns {string} - CSS class name
 */
function getCategoryColorClass(category) {
    if (!category) return '';
    
    const colorMap = {
        'إلكترونيات': 'category-electronics',
        'ملابس': 'category-clothing',
        'أغذية': 'category-food',
        'كتب': 'category-books',
        'منزلية': 'category-home'
    };
    
    return colorMap[category] || 'category-default';
}

/**
 * Calculate profit margin
 * @param {number} cost - Cost price
 * @param {number} selling - Selling price
 * @returns {number} - Profit margin percentage
 */
function calculateProfitMargin(cost, selling) {
    if (!cost || !selling || cost <= 0) return 0;
    
    const profit = selling - cost;
    return (profit / cost) * 100;
}

/**
 * Get Arabic day name
 * @param {Date} date - Date object
 * @returns {string} - Arabic day name
 */
function getArabicDayName(date) {
    const days = [
        'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 
        'الخميس', 'الجمعة', 'السبت'
    ];
    return days[date.getDay()];
}

/**
 * Get Arabic month name
 * @param {Date} date - Date object
 * @returns {string} - Arabic month name
 */
function getArabicMonthName(date) {
    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[date.getMonth()];
}

// Initialize utility functions
document.addEventListener('DOMContentLoaded', function() {
    // Set default date for date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value && input.id !== 'filterDateFrom' && input.id !== 'filterDateTo') {
            input.value = getTodayDate();
        }
    });
    
    // Add number formatting to currency inputs
    const currencyInputs = document.querySelectorAll('input[type="number"][step="0.01"]');
    currencyInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) {
                this.value = parseFloat(this.value).toFixed(2);
            }
        });
    });
    
    // Add phone number formatting
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) {
                this.value = formatPhone(this.value);
            }
        });
    });
});
