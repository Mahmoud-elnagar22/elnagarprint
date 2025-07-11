// Product management functionality for Arabic RTL Order Management System

let currentProducts = [];
let currentCategories = [];
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeProductsPage();
    loadCategories();
    loadProducts();
    setupEventListeners();
});

function initializeProductsPage() {
    // Check XLSX library availability
    if (typeof XLSX === 'undefined') {
        console.error('XLSX library not loaded');
        setTimeout(() => {
            showNotification('تعذر تحميل مكتبة Excel، وظائف الاستيراد والتصدير غير متاحة', 'warning');
        }, 1000);
    } else {
        console.log('XLSX library loaded successfully, version:', XLSX.version);
    }
    
    // Initialize form
    document.getElementById('productForm').addEventListener('submit', handleAddProduct);
    
    // Initialize import file handlers
    const importFile = document.getElementById('importFile');
    const excelFile = document.getElementById('excelFile');
    const backupFile = document.getElementById('backupFile');
    
    if (importFile) importFile.addEventListener('change', handleCSVImport);
    if (excelFile) excelFile.addEventListener('change', handleExcelImport);
    if (backupFile) backupFile.addEventListener('change', handleBackupImport);
    
    // Initialize search and filter handlers
    document.getElementById('searchName').addEventListener('input', debounce(filterProducts, 300));
    document.getElementById('filterCategory').addEventListener('change', filterProducts);
    document.getElementById('filterPrice').addEventListener('change', filterProducts);
    
    // Set today's date as default
    const today = getTodayDate();
    console.log('Products page initialized');
}

async function loadCategories() {
    try {
        // Try database first
        try {
            currentCategories = await databaseStorage.getCategories();
            console.log('تم تحميل التصنيفات من قاعدة البيانات:', currentCategories.length);
        } catch (dbError) {
            console.log('فشل تحميل التصنيفات من قاعدة البيانات، العودة للتخزين المحلي');
            currentCategories = JSON.parse(localStorage.getItem('categories') || '[]');
        }
        
        updateCategorySelectors();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('خطأ في تحميل التصنيفات', 'error');
    }
}

function updateCategorySelectors() {
    const selectors = [
        'productCategory',
        'filterCategory',
        'newProductCategory'
    ];
    
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            // Keep current value
            const currentValue = selector.value;
            
            // Clear and rebuild options
            if (selectorId === 'filterCategory') {
                selector.innerHTML = '<option value="">جميع التصنيفات</option>';
            } else {
                selector.innerHTML = '<option value="">اختر التصنيف</option>';
            }
            
            currentCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                selector.appendChild(option);
            });
            
            // Restore value if it still exists
            if (currentValue && currentCategories.includes(currentValue)) {
                selector.value = currentValue;
            }
        }
    });
    
    // Update the categories display list
    updateCategoriesDisplay();
}

function updateCategoriesDisplay() {
    const categoriesContainer = document.getElementById('categoriesList');
    
    if (currentCategories.length === 0) {
        categoriesContainer.innerHTML = '<span class="text-muted">لا توجد تصنيفات مضافة بعد</span>';
        return;
    }
    
    let html = '';
    currentCategories.forEach(category => {
        html += `
            <span class="badge bg-primary fs-6 me-2 mb-2 d-inline-flex align-items-center">
                ${sanitizeInput(category)}
                <button type="button" class="btn-close btn-close-white btn-sm ms-2" 
                        onclick="deleteCategory('${category}')" 
                        title="حذف التصنيف"
                        style="font-size: 0.7em;"></button>
            </span>
        `;
    });
    
    categoriesContainer.innerHTML = html;
}

async function loadProducts() {
    try {
        console.log('=== محاولة الاتصال بقاعدة البيانات ===');
        
        // Try database first
        try {
            currentProducts = await databaseStorage.getProducts();
            console.log('✅ تم التحميل من قاعدة البيانات:', currentProducts.length, 'منتج');
            
            if (currentProducts.length > 0) {
                console.log('نموذج من المنتجات:', currentProducts.slice(0, 2));
            }
            
            filteredProducts = [...currentProducts];
            renderProductsTable();
            
            if (currentProducts.length === 0) {
                // Check if there's LocalStorage data to migrate
                const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
                if (localProducts.length > 0) {
                    showNotification(`يوجد ${localProducts.length} منتج في التخزين المحلي. اضغط "نقل البيانات" لنقلها إلى قاعدة البيانات`, 'warning');
                } else {
                    showNotification('قاعدة البيانات فارغة. استخدم "استيراد Excel" أو أضف منتجات يدوياً', 'info');
                }
            }
            // Remove the success notification for normal loading
        } catch (dbError) {
            console.log('⚠️ فشل الاتصال بقاعدة البيانات، العودة للتخزين المحلي');
            console.error('Database error:', dbError);
            
            // Fallback to LocalStorage
            currentProducts = JSON.parse(localStorage.getItem('products') || '[]');
            console.log('📂 تم التحميل من التخزين المحلي:', currentProducts.length, 'منتج');
            
            filteredProducts = [...currentProducts];
            renderProductsTable();
            
            if (currentProducts.length === 0) {
                showNotification('لا توجد منتجات محفوظة. استخدم "استيراد Excel" أو أضف منتجات يدوياً', 'info');
            } else {
                showNotification(`تم تحميل ${currentProducts.length} منتج من التخزين المحلي. قاعدة البيانات غير متاحة`, 'warning');
            }
        }
        
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error);
        showNotification('خطأ في تحميل المنتجات', 'error');
    }
}

function renderProductsTable() {
    const tableBody = document.getElementById('productsTable');
    const priceFilter = document.getElementById('filterPrice').value;
    
    if (filteredProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    <i class="fas fa-box me-2"></i>
                    لا توجد منتجات مطابقة للفلاتر المحددة
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    filteredProducts.forEach(product => {
        const categoryClass = getCategoryColorClass(product.category);
        const stockStatus = getStockStatus(product);
        
        // Highlight price columns based on filter
        const wholesaleHighlight = priceFilter === 'wholesale' ? 'bg-primary text-white' : '';
        const retailHighlight = priceFilter === 'retail' ? 'bg-success text-white' : '';
        
        html += `
            <tr class="category-row ${categoryClass}">
                <td>
                    <span class="editable-cell" onclick="editProductField('${product.id}', 'name', this)">${sanitizeInput(product.name)}</span>
                </td>
                <td>
                    <span class="editable-cell" onclick="editProductCategory('${product.id}', this)">${sanitizeInput(product.category)}</span>
                </td>
                <td>
                    <span class="editable-cell text-currency" onclick="editProductField('${product.id}', 'costPrice', this)">${formatCurrency(product.costPrice)}</span>
                </td>
                <td class="${wholesaleHighlight}">
                    <span class="editable-cell text-currency" onclick="editProductField('${product.id}', 'wholesalePrice', this)">${formatCurrency(product.wholesalePrice)}</span>
                </td>
                <td class="${retailHighlight}">
                    <span class="editable-cell text-currency" onclick="editProductField('${product.id}', 'retailPrice', this)">${formatCurrency(product.retailPrice)}</span>
                </td>
                <td>
                    <span class="editable-cell" onclick="editProductField('${product.id}', 'quantity', this)">${product.infiniteStock ? '∞' : product.quantity}</span>
                </td>
                <td>
                    <span class="badge ${stockStatus.class}">${stockStatus.text}</span>
                    ${product.isManufactured ? '<br><small class="text-info">مُصنع</small>' : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-success me-1" onclick="showEditProductModal('${product.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="duplicateProduct('${product.id}')" title="نسخ">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${product.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

function getStockStatus(product) {
    if (product.infiniteStock) {
        return { class: 'bg-success text-white', text: 'لا ينفد' };
    }
    
    if (product.quantity <= 0) {
        return { class: 'bg-danger text-white', text: 'نافد' };
    }
    
    if (product.quantity < 5) {
        return { class: 'bg-warning text-dark', text: 'قليل' };
    }
    
    return { class: 'bg-success text-white', text: 'متوفر' };
}

function handleAddProduct(e) {
    e.preventDefault();
    
    const form = e.target;
    if (!validateRequiredFields(form)) {
        showNotification('يرجى ملء جميع الحقول المطلوبة', 'warning');
        return;
    }
    
    const formData = new FormData(form);
    const product = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        costPrice: parseFloat(document.getElementById('costPrice').value),
        wholesalePrice: parseFloat(document.getElementById('wholesalePrice').value),
        retailPrice: parseFloat(document.getElementById('retailPrice').value),
        quantity: parseInt(document.getElementById('productQuantity').value),
        infiniteStock: document.getElementById('infiniteStock').checked,
        isManufactured: document.getElementById('isManufactured').checked
    };
    
    // Validate prices
    if (product.wholesalePrice < product.costPrice) {
        showNotification('سعر الجملة لا يمكن أن يكون أقل من سعر التكلفة', 'warning');
        return;
    }
    
    if (product.retailPrice < product.wholesalePrice) {
        showNotification('سعر القطاعي لا يمكن أن يكون أقل من سعر الجملة', 'warning');
        return;
    }
    
    try {
        const editingId = form.dataset.editingId;
        
        console.log('محاولة حفظ المنتج:', product);
        
        if (editingId) {
            // Update existing product
            databaseStorage.updateProduct(editingId, product).then(() => {
                console.log('تم تحديث المنتج بنجاح');
                showNotification('تم تحديث المنتج بنجاح', 'success');
                form.reset();
                delete form.dataset.editingId;
                // Reset button text
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i>إضافة المنتج';
                loadProducts();
            }).catch(error => {
                console.error('خطأ في تحديث المنتج:', error);
                showNotification('خطأ في تحديث المنتج', 'error');
            });
        } else {
            // Add new product
            databaseStorage.addProduct(product).then(() => {
                console.log('تم إضافة المنتج بنجاح');
                showNotification('تم إضافة المنتج بنجاح', 'success');
                form.reset();
                loadProducts();
            }).catch(error => {
                console.error('خطأ في إضافة المنتج:', error);
                showNotification('خطأ في إضافة المنتج', 'error');
            });
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('خطأ في حفظ المنتج', 'error');
    }
}

function editProductField(productId, field, element) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const currentValue = product[field];
    const input = document.createElement('input');
    
    if (field.includes('Price')) {
        input.type = 'number';
        input.step = '0.01';
        input.value = currentValue;
    } else if (field === 'quantity') {
        input.type = 'number';
        input.min = '0';
        input.value = currentValue;
    } else {
        input.type = 'text';
        input.value = currentValue;
    }
    
    input.className = 'form-control form-control-sm';
    input.style.width = '100%';
    
    // Replace element content with input
    element.innerHTML = '';
    element.appendChild(input);
    element.classList.add('editing');
    input.focus();
    input.select();
    
    // Handle save on blur or enter
    const saveValue = () => {
        let newValue = input.value.trim();
        
        if (field.includes('Price') || field === 'quantity') {
            newValue = parseFloat(newValue);
            if (isNaN(newValue) || newValue < 0) {
                showNotification('قيمة غير صالحة', 'warning');
                cancelEdit();
                return;
            }
        }
        
        if (field === 'name' && !newValue) {
            showNotification('اسم المنتج مطلوب', 'warning');
            cancelEdit();
            return;
        }
        
        try {
            databaseStorage.updateProduct(productId, { [field]: newValue }).then(() => {
                loadProducts();
                showNotification('تم تحديث المنتج بنجاح', 'success');
            });
        } catch (error) {
            console.error('Error updating product:', error);
            showNotification('خطأ في تحديث المنتج', 'error');
            cancelEdit();
        }
    };
    
    const cancelEdit = () => {
        element.classList.remove('editing');
        if (field.includes('Price')) {
            element.textContent = formatCurrency(currentValue);
        } else {
            element.textContent = currentValue;
        }
    };
    
    input.addEventListener('blur', saveValue);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveValue();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

function editProductCategory(productId, element) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    
    currentCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.selected = category === product.category;
        select.appendChild(option);
    });
    
    element.innerHTML = '';
    element.appendChild(select);
    element.classList.add('editing');
    select.focus();
    
    const saveValue = () => {
        const newValue = select.value;
        
        try {
            databaseStorage.updateProduct(productId, { category: newValue }).then(() => {
                loadProducts();
                showNotification('تم تحديث التصنيف بنجاح', 'success');
            });
        } catch (error) {
            console.error('Error updating product category:', error);
            showNotification('خطأ في تحديث التصنيف', 'error');
            element.classList.remove('editing');
            element.textContent = product.category;
        }
    };
    
    const cancelEdit = () => {
        element.classList.remove('editing');
        element.textContent = product.category;
    };
    
    select.addEventListener('blur', saveValue);
    select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveValue();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

function showEditProductModal(productId) {
    console.log('تعديل المنتج:', productId);
    console.log('المنتجات المتاحة:', currentProducts.length);
    
    const product = currentProducts.find(p => p.id == productId); // Use == for flexible comparison
    if (!product) {
        console.error('المنتج غير موجود:', productId);
        showNotification('المنتج غير موجود', 'error');
        return;
    }
    
    console.log('تم العثور على المنتج:', product);
    
    // Fill the form with current product data
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('costPrice').value = product.costPrice || 0;
    document.getElementById('wholesalePrice').value = product.wholesalePrice || 0;
    document.getElementById('retailPrice').value = product.retailPrice || 0;
    document.getElementById('productQuantity').value = product.quantity || 0;
    document.getElementById('infiniteStock').checked = product.infiniteStock || false;
    document.getElementById('isManufactured').checked = product.isManufactured || false;
    
    // Change the form submit behavior for editing
    const form = document.getElementById('productForm');
    form.dataset.editingId = productId;
    
    // Change button text
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>تحديث المنتج';
    
    // Show the form section and highlight it
    const formSection = document.getElementById('productForm').closest('.card');
    formSection.scrollIntoView({ behavior: 'smooth' });
    formSection.style.border = '2px solid #0d6efd';
    setTimeout(() => {
        formSection.style.border = '';
    }, 3000);
    
    showNotification('تم تحميل بيانات المنتج للتعديل', 'info');
}

function duplicateProduct(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;
    
    const duplicatedProduct = {
        ...product,
        name: `${product.name} - نسخة`,
        quantity: 0
    };
    
    delete duplicatedProduct.id;
    delete duplicatedProduct.createdAt;
    
    try {
        databaseStorage.addProduct(duplicatedProduct).then(() => {
            showNotification('تم نسخ المنتج بنجاح', 'success');
            loadProducts();
        });
    } catch (error) {
        console.error('Error duplicating product:', error);
        showNotification('خطأ في نسخ المنتج', 'error');
    }
}

function deleteProduct(productId) {
    confirmDialog('هل أنت متأكد من حذف هذا المنتج؟', () => {
        try {
            databaseStorage.deleteProduct(productId).then(() => {
                showNotification('تم حذف المنتج بنجاح', 'success');
                loadProducts();
            });
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('خطأ في حذف المنتج', 'error');
        }
    });
}

function filterProducts() {
    const nameFilter = document.getElementById('searchName').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('filterCategory').value;
    const priceFilter = document.getElementById('filterPrice').value;
    
    filteredProducts = currentProducts.filter(product => {
        // Name filter
        if (nameFilter && !product.name.toLowerCase().includes(nameFilter)) {
            return false;
        }
        
        // Category filter
        if (categoryFilter && product.category !== categoryFilter) {
            return false;
        }
        
        // Price filter - highlight wholesale or retail pricing
        if (priceFilter) {
            // This filter doesn't actually filter products, just affects display
            // All products have both wholesale and retail prices
            // The filtering is for UI highlighting purposes
        }
        
        return true;
    });
    
    renderProductsTable();
}

function clearFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterPrice').value = '';
    filterProducts();
}

function addNewCategory() {
    const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
    document.getElementById('categoryName').value = '';
    modal.show();
}

function saveCategory() {
    const categoryName = document.getElementById('categoryName').value.trim();
    
    if (!categoryName) {
        showNotification('اسم التصنيف مطلوب', 'warning');
        return;
    }
    
    if (currentCategories.includes(categoryName)) {
        showNotification('التصنيف موجود بالفعل', 'warning');
        return;
    }
    
    try {
        databaseStorage.addCategory(categoryName).then(() => {
            currentCategories.push(categoryName);
            updateCategorySelectors();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
            modal.hide();
            
            showNotification('تم إضافة التصنيف بنجاح', 'success');
        });
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('خطأ في إضافة التصنيف', 'error');
    }
}

function deleteCategory(categoryName) {
    // Check if any products use this category
    const productsWithCategory = currentProducts.filter(product => product.category === categoryName);
    
    if (productsWithCategory.length > 0) {
        showNotification(`لا يمكن حذف التصنيف "${categoryName}" لأنه يحتوي على ${productsWithCategory.length} منتج`, 'warning');
        return;
    }
    
    confirmDialog(`هل أنت متأكد من حذف التصنيف "${categoryName}"؟`, () => {
        try {
            databaseStorage.deleteCategory(categoryName).then(() => {
                const index = currentCategories.indexOf(categoryName);
                if (index > -1) {
                    currentCategories.splice(index, 1);
                }
                updateCategorySelectors();
                showNotification('تم حذف التصنيف بنجاح', 'success');
            }).catch(error => {
                console.error('Error deleting category:', error);
                showNotification('خطأ في حذف التصنيف', 'error');
            });
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('خطأ في حذف التصنيف', 'error');
        }
    });
}

function exportProducts() {
    try {
        const products = currentProducts;
        
        if (products.length === 0) {
            showNotification('لا توجد منتجات للتصدير', 'warning');
            return;
        }
        
        const headers = [
            'name', 'category', 'costPrice', 'wholesalePrice', 'retailPrice', 
            'quantity', 'infiniteStock', 'isManufactured', 'createdAt'
        ];
        
        const arabicHeaders = [
            'اسم المنتج', 'التصنيف', 'سعر التكلفة', 'سعر الجملة', 'سعر القطاعي',
            'الكمية', 'لا ينفد', 'مُصنع', 'تاريخ الإنشاء'
        ];
        
        // Create export data with Arabic headers
        const exportData = products.map(product => {
            const row = {};
            headers.forEach((header, index) => {
                let value = product[header] || '';
                
                if (header === 'infiniteStock' || header === 'isManufactured') {
                    value = value ? 'نعم' : 'لا';
                } else if (header === 'createdAt' && value) {
                    value = formatDate(value);
                }
                
                row[arabicHeaders[index]] = value;
            });
            return row;
        });
        
        exportToCSV(exportData, 'المنتجات', arabicHeaders);
    } catch (error) {
        console.error('Error exporting products:', error);
        showNotification('خطأ في تصدير المنتجات', 'error');
    }
}

function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    importFromCSV(file, (data) => {
        try {
            if (data.length === 0) {
                showNotification('الملف فارغ أو لا يحتوي على بيانات صالحة', 'warning');
                return;
            }
            
            // Use the shared data processing function
            processImportedData(data);
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            showNotification('خطأ في استيراد ملف CSV - تأكد من تنسيق الملف', 'error');
        }
    });
    
    // Reset input
    e.target.value = '';
}

function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if XLSX library is loaded
    if (typeof XLSX === 'undefined') {
        showNotification('مكتبة Excel غير محملة بشكل صحيح، يرجى تحديث الصفحة', 'error');
        e.target.value = '';
        return;
    }
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        showNotification('يرجى اختيار ملف Excel صالح (.xlsx أو .xls)', 'warning');
        e.target.value = '';
        return;
    }
    
    showNotification('جاري قراءة ملف Excel...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            console.log('File size:', data.length, 'bytes');
            
            const workbook = XLSX.read(data, { type: 'array' });
            console.log('Workbook sheets:', workbook.SheetNames);
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                showNotification('ملف Excel لا يحتوي على أوراق عمل', 'warning');
                return;
            }
            
            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                blankrows: false 
            });
            
            console.log('Raw JSON data:', jsonData);
            
            if (jsonData.length === 0) {
                showNotification('الملف فارغ أو لا يحتوي على بيانات صالحة', 'warning');
                return;
            }
            
            // Convert array format to object format
            const headers = jsonData[0];
            const dataRows = jsonData.slice(1);
            
            const formattedData = dataRows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });
            
            console.log('Formatted data:', formattedData);
            
            if (formattedData.length === 0) {
                showNotification('لا توجد بيانات للاستيراد بعد الصف الأول', 'warning');
                return;
            }
            
            // Process imported data
            processImportedData(formattedData);
            
        } catch (error) {
            console.error('Error reading Excel file:', error);
            showNotification(`خطأ في قراءة ملف Excel: ${error.message}`, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('خطأ في قراءة الملف', 'error');
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function exportExcel() {
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            showNotification('مكتبة Excel غير محملة بشكل صحيح، يرجى تحديث الصفحة', 'error');
            return;
        }
        
        const products = storage.getProducts();
        
        if (products.length === 0) {
            showNotification('لا توجد منتجات للتصدير', 'warning');
            return;
        }
        
        showNotification('جاري تصدير المنتجات...', 'info');
        
        // Prepare data for Excel export
        const exportData = products.map(product => ({
            'اسم المنتج': product.name || '',
            'التصنيف': product.category || '',
            'سعر التكلفة': product.costPrice || 0,
            'سعر الجملة': product.wholesalePrice || 0,
            'سعر القطاعي': product.retailPrice || 0,
            'الكمية': product.quantity || 0,
            'لا ينفد': product.infiniteStock ? 'نعم' : 'لا',
            'مُصنع': product.isManufactured ? 'نعم' : 'لا',
            'تاريخ الإنشاء': product.createdAt ? formatDate(product.createdAt) : ''
        }));
        
        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths for better formatting
        const columnWidths = [
            { wch: 20 }, // اسم المنتج
            { wch: 15 }, // التصنيف  
            { wch: 12 }, // سعر التكلفة
            { wch: 12 }, // سعر الجملة
            { wch: 12 }, // سعر القطاعي
            { wch: 10 }, // الكمية
            { wch: 10 }, // لا ينفد
            { wch: 10 }, // مُصنع
            { wch: 15 }  // تاريخ الإنشاء
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');
        
        // Generate filename with current date
        const now = new Date();
        const filename = `المنتجات_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.xlsx`;
        
        // Save file
        XLSX.writeFile(workbook, filename);
        
        showNotification('تم تصدير المنتجات بنجاح', 'success');
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification(`خطأ في تصدير Excel: ${error.message}`, 'error');
    }
}

function downloadExcelTemplate() {
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            showNotification('مكتبة Excel غير محملة بشكل صحيح، يرجى تحديث الصفحة', 'error');
            return;
        }
        
        const templateData = [{
            'اسم المنتج': 'مثال منتج',
            'التصنيف': 'إلكترونيات',
            'سعر التكلفة': 100,
            'سعر الجملة': 120,
            'سعر القطاعي': 150,
            'الكمية': 10,
            'لا ينفد': 'لا',
            'مُصنع': 'لا'
        }];
        
        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Set column widths for better formatting
        const columnWidths = [
            { wch: 20 }, // اسم المنتج
            { wch: 15 }, // التصنيف  
            { wch: 12 }, // سعر التكلفة
            { wch: 12 }, // سعر الجملة
            { wch: 12 }, // سعر القطاعي
            { wch: 10 }, // الكمية
            { wch: 10 }, // لا ينفد
            { wch: 10 }  // مُصنع
        ];
        worksheet['!cols'] = columnWidths;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج المنتجات');
        
        // Save template file
        XLSX.writeFile(workbook, 'نموذج_المنتجات.xlsx');
        
        showNotification('تم تحميل نموذج Excel بنجاح', 'success');
        
    } catch (error) {
        console.error('Error creating Excel template:', error);
        showNotification(`خطأ في إنشاء نموذج Excel: ${error.message}`, 'error');
    }
}

async function processImportedData(data) {
    try {
        let importedCount = 0;
        let skippedCount = 0;
        let errors = [];
        
        // Get current data from database
        let currentProducts, currentCategories;
        try {
            currentProducts = await databaseStorage.getProducts();
            currentCategories = await databaseStorage.getCategories();
        } catch (dbError) {
            console.log('Using LocalStorage fallback for data processing');
            currentProducts = JSON.parse(localStorage.getItem('products') || '[]');
            currentCategories = JSON.parse(localStorage.getItem('categories') || '[]');
        }
        
        const productsToImport = [];
        
        data.forEach((row, index) => {
            try {
                // Map headers (support both Arabic and English)
                const product = {
                    name: (row['اسم المنتج'] || row['name'] || '').toString().trim(),
                    category: (row['التصنيف'] || row['category'] || '').toString().trim(),
                    costPrice: parseFloat(row['سعر التكلفة'] || row['costPrice'] || 0),
                    wholesalePrice: parseFloat(row['سعر الجملة'] || row['wholesalePrice'] || 0),
                    retailPrice: parseFloat(row['سعر القطاعي'] || row['retailPrice'] || 0),
                    quantity: row['الكمية'] || row['quantity'] ? parseInt(row['الكمية'] || row['quantity'] || 0) : 0,
                    infiniteStock: (row['لا ينفد'] || row['infiniteStock'] || '').toString().toLowerCase() === 'نعم' || 
                                  (row['لا ينفد'] || row['infiniteStock'] || '').toString().toLowerCase() === 'true' ||
                                  (row['لا ينفد'] || row['infiniteStock'] || '').toString() === '1',
                    isManufactured: (row['مُصنع'] || row['isManufactured'] || '').toString().toLowerCase() === 'نعم' || 
                                   (row['مُصنع'] || row['isManufactured'] || '').toString().toLowerCase() === 'true' ||
                                   (row['مُصنع'] || row['isManufactured'] || '').toString() === '1'
                };
                
                console.log(`Processing product ${index + 1}:`, product);
                
                // Validate required fields
                let isValid = true;
                let validationErrors = [];
                
                if (!product.name) {
                    validationErrors.push('اسم المنتج مطلوب');
                    isValid = false;
                }
                
                if (!product.category) {
                    validationErrors.push('التصنيف مطلوب');
                    isValid = false;
                }
                
                if (isNaN(product.costPrice) || product.costPrice < 0) {
                    validationErrors.push('سعر التكلفة غير صالح');
                    isValid = false;
                }
                
                if (isNaN(product.wholesalePrice) || product.wholesalePrice < 0) {
                    validationErrors.push('سعر الجملة غير صالح');
                    isValid = false;
                }
                
                if (isNaN(product.retailPrice) || product.retailPrice < 0) {
                    validationErrors.push('سعر القطاعي غير صالح');
                    isValid = false;
                }
                
                if (isNaN(product.quantity) || product.quantity < 0) {
                    product.quantity = 0;
                }
                
                console.log(`Product validation for "${product.name}":`, {
                    name: product.name,
                    category: product.category,
                    costPrice: product.costPrice,
                    wholesalePrice: product.wholesalePrice,
                    retailPrice: product.retailPrice,
                    isValid: isValid,
                    validationErrors: validationErrors
                });
                
                if (isValid) {
                    // Check for duplicate products
                    const existingProduct = currentProducts.find(p => 
                        p.name.toLowerCase() === product.name.toLowerCase() && 
                        p.category.toLowerCase() === product.category.toLowerCase()
                    );
                    
                    if (existingProduct) {
                        errors.push(`السطر ${index + 2}: المنتج "${product.name}" موجود بالفعل`);
                        skippedCount++;
                    } else {
                        // Add category to list if it doesn't exist
                        if (!currentCategories.includes(product.category)) {
                            currentCategories.push(product.category);
                        }
                        
                        // Add product to import list
                        productsToImport.push(product);
                        importedCount++;
                    }
                } else {
                    errors.push(`السطر ${index + 2}: ${validationErrors.join(', ')}`);
                    skippedCount++;
                }
                
            } catch (rowError) {
                console.error(`Error processing row ${index + 2}:`, rowError);
                errors.push(`السطر ${index + 2}: خطأ في معالجة البيانات`);
                skippedCount++;
            }
        });
        
        console.log(`Import completed. Total imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`);
        
        // Bulk import to database
        if (productsToImport.length > 0) {
            try {
                console.log('Starting bulk import to database...');
                const result = await databaseStorage.bulkImportProducts(productsToImport);
                console.log('Database import result:', result);
                
                // Update UI
                console.log('Updating UI...');
                await loadCategories();
                await loadProducts();
                console.log('UI updated successfully');
            } catch (dbError) {
                console.log('Database import failed, falling back to LocalStorage');
                
                // Fallback to LocalStorage
                const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
                const localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
                
                productsToImport.forEach(product => {
                    product.id = databaseStorage.generateId();
                    product.createdAt = new Date().toISOString();
                    localProducts.push(product);
                });
                
                // Update categories
                const newCategories = [...new Set([...localCategories, ...currentCategories])];
                
                localStorage.setItem('products', JSON.stringify(localProducts));
                localStorage.setItem('categories', JSON.stringify(newCategories));
                
                await loadCategories();
                await loadProducts();
            }
        }
        
        // Show results
        if (importedCount > 0) {
            showNotification(`تم استيراد ${importedCount} منتج بنجاح${skippedCount > 0 ? ` وتم تجاهل ${skippedCount} منتج` : ''}`, 'success');
        } else {
            showNotification('لم يتم استيراد أي منتجات صالحة', 'warning');
        }
        
        // Show detailed errors if any
        if (errors.length > 0 && errors.length <= 10) {
            setTimeout(() => {
                const errorMsg = 'الأخطاء التي حدثت:\n' + errors.slice(0, 10).join('\n');
                alert(errorMsg);
            }, 1000);
        } else if (errors.length > 10) {
            setTimeout(() => {
                alert(`حدثت ${errors.length} أخطاء. يرجى التحقق من تنسيق الملف وبيانات المنتجات.`);
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error processing imported data:', error);
        showNotification('خطأ في معالجة البيانات المستوردة', 'error');
    }
}

function exportAllData() {
    try {
        // Get all data from storage
        const allData = {
            products: storage.getProducts(),
            categories: storage.getCategories(),
            clients: storage.getClients() || [],
            orders: storage.getOrders() || [],
            suppliers: storage.getSuppliers() || [],
            expenses: storage.getExpenses() || [],
            savings: storage.getSavings() || [],
            reminders: storage.getReminders() || [],
            settings: storage.getSettings() || {},
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Create and download file
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        
        const now = new Date();
        const filename = `نسخة_احتياطية_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.json`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('تم تصدير النسخة الاحتياطية بنجاح', 'success');
        
    } catch (error) {
        console.error('Error exporting backup:', error);
        showNotification('خطأ في تصدير النسخة الاحتياطية', 'error');
    }
}

function handleBackupImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        showNotification('يرجى اختيار ملف JSON صالح', 'warning');
        e.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const backupData = JSON.parse(event.target.result);
            
            // Validate backup data structure
            if (!backupData.products || !Array.isArray(backupData.products)) {
                showNotification('ملف النسخة الاحتياطية غير صالح', 'error');
                return;
            }
            
            // Confirm restore
            if (confirm('هل أنت متأكد من استعادة البيانات؟ سيتم استبدال جميع البيانات الحالية.')) {
                // Restore data
                if (backupData.products) storage.saveProducts(backupData.products);
                if (backupData.categories) storage.saveCategories(backupData.categories);
                if (backupData.clients) storage.saveClients(backupData.clients);
                if (backupData.orders) storage.saveOrders(backupData.orders);
                if (backupData.suppliers) storage.saveSuppliers(backupData.suppliers);
                if (backupData.expenses) storage.saveExpenses(backupData.expenses);
                if (backupData.savings) storage.saveSavings(backupData.savings);
                if (backupData.reminders) storage.saveReminders(backupData.reminders);
                if (backupData.settings) storage.saveSettings(backupData.settings);
                
                // Refresh UI
                loadCategories();
                loadProducts();
                
                showNotification(`تم استعادة البيانات بنجاح. تم استعادة ${backupData.products.length} منتج`, 'success');
            }
            
        } catch (error) {
            console.error('Error importing backup:', error);
            showNotification('خطأ في قراءة ملف النسخة الاحتياطية', 'error');
        }
    };
    
    reader.readAsText(file);
    e.target.value = '';
}

async function migrateToDatabase() {
    try {
        // Get LocalStorage data
        const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
        const localCategories = JSON.parse(localStorage.getItem('categories') || '[]');
        
        if (localProducts.length === 0 && localCategories.length === 0) {
            showNotification('لا توجد بيانات في التخزين المحلي للنقل', 'warning');
            return;
        }
        
        // Confirm migration
        const confirmMsg = `هل تريد نقل ${localProducts.length} منتج و ${localCategories.length} تصنيف إلى قاعدة البيانات؟\nستتم إضافة البيانات إلى قاعدة البيانات الموجودة.`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        showNotification('جاري نقل البيانات إلى قاعدة البيانات...', 'info');
        
        // Import to database
        const result = await databaseStorage.importFromLocalStorage({
            products: localProducts,
            categories: localCategories
        });
        
        if (result.success) {
            showNotification(`تم نقل البيانات بنجاح! تم نقل ${result.importedCount} منتج`, 'success');
            
            // Refresh data from database
            await loadCategories();
            await loadProducts();
            
            // Ask if user wants to clear LocalStorage
            if (confirm('تم نقل البيانات بنجاح إلى قاعدة البيانات. هل تريد مسح البيانات من التخزين المحلي؟')) {
                localStorage.removeItem('products');
                localStorage.removeItem('categories');
                showNotification('تم مسح البيانات من التخزين المحلي', 'info');
            }
        } else {
            showNotification('فشل في نقل البيانات إلى قاعدة البيانات', 'error');
        }
        
    } catch (error) {
        console.error('Error migrating to database:', error);
        showNotification('خطأ في نقل البيانات إلى قاعدة البيانات', 'error');
    }
}

function setupEventListeners() {
    // Category form submission
    document.getElementById('categoryForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCategory();
    });
    
    // Infinite stock checkbox handler
    document.getElementById('infiniteStock').addEventListener('change', function() {
        const quantityInput = document.getElementById('quantity');
        if (this.checked) {
            quantityInput.value = 0;
            quantityInput.disabled = true;
        } else {
            quantityInput.disabled = false;
        }
    });
}
