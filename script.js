let products = loadProducts();

function loadProducts() {
    const data = localStorage.getItem("inventoryProducts");
    if (!data) return [];

    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("データの読み込みに失敗しました。", error);
        return [];
    }
}

function saveProducts() {
    localStorage.setItem("inventoryProducts", JSON.stringify(products));
}

function createId() {
    return Date.now().toString() + Math.random().toString(16).slice(2);
}

document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
});

function switchTab(tabName) {
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabName);
    });

    document.querySelectorAll(".tab-content").forEach(section => {
        section.classList.toggle("active", section.id === tabName);
    });

    renderAll();
}

document.getElementById("productForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("category").value;
    const stock = Number(document.getElementById("stock").value);
    const minimumStock = Number(document.getElementById("minimumStock").value);
    const shop = document.getElementById("shop").value.trim();

    if (!name || !shop) {
        alert("商品名と買う場所を入力してください。");
        return;
    }

    products.push({
        id: createId(),
        name,
        category,
        stock,
        minimumStock,
        shop,
        purchaseHistory: []
    });

    saveProducts();
    alert("商品を登録しました。");

    this.reset();
    document.getElementById("stock").value = 0;
    document.getElementById("minimumStock").value = 1;

    switchTab("inventory");
});

function renderInventory() {
    const list = document.getElementById("inventoryList");
    const category = document.getElementById("categoryFilter").value;
    const search = document.getElementById("searchInput").value.trim().toLowerCase();

    let filteredProducts = products.filter(product => {
        const categoryMatch = category === "すべて" || product.category === category;
        const searchMatch = product.name.toLowerCase().includes(search);
        return categoryMatch && searchMatch;
    });

    if (filteredProducts.length === 0) {
        list.innerHTML = '<div class="empty-message">商品がありません。</div>';
        return;
    }

    filteredProducts.sort((a, b) => {
        if (a.category === b.category) return a.name.localeCompare(b.name, "ja");
        return a.category === "食品" ? -1 : 1;
    });

    list.innerHTML = filteredProducts.map(createProductCard).join("");
}

function createProductCard(product) {
    const isLowStock = product.stock <= product.minimumStock;

    return `
        <div class="product-card">
            <div class="product-header">
                <div>
                    <div class="product-name">${escapeHtml(product.name)}</div>
                    <div class="category">${escapeHtml(product.category)}</div>
                </div>
            </div>

            <div class="stock-area">
                <button class="stock-button" onclick="changeStock('${product.id}', -1)">−</button>
                <div class="stock-number">${product.stock}</div>
                <button class="stock-button" onclick="changeStock('${product.id}', 1)">＋</button>
            </div>

            ${isLowStock ? '<div class="low-stock">要補充</div>' : ""}

            <div class="shop-name">買う場所：${escapeHtml(product.shop)}</div>
            <div>最低在庫：${product.minimumStock}</div>

            <div class="product-actions">
                <button class="small-button" onclick="showProductDetail('${product.id}')">詳細</button>
                <button class="small-button delete-button" onclick="deleteProduct('${product.id}')">削除</button>
            </div>
        </div>
    `;
}

function changeStock(id, amount) {
    const product = products.find(product => product.id === id);
    if (!product) return;

    product.stock += amount;
    if (product.stock < 0) product.stock = 0;

    saveProducts();
    renderAll();
}

function showProductDetail(id) {
    const product = products.find(product => product.id === id);
    if (!product) return;

    const history = product.purchaseHistory || [];

    const historyHtml = history.length === 0
        ? "<p>購入履歴はありません。</p>"
        : history.map(item => `
            <div class="history-item">${item.date}：${item.quantity}個</div>
        `).join("");

    document.getElementById("modalBody").innerHTML = `
        <h2>${escapeHtml(product.name)}</h2>
        <p>カテゴリ：${escapeHtml(product.category)}</p>
        <p>現在庫：<strong>${product.stock}</strong></p>
        <p>最低在庫：${product.minimumStock}</p>
        <p>買う場所：${escapeHtml(product.shop)}</p>

        <hr>

        <h3>購入する</h3>
        <div class="form-group">
            <label>購入数</label>
            <input type="number" id="purchaseQuantity" min="1" value="1">
        </div>

        <button class="primary-button" onclick="purchaseProduct('${product.id}')">
            購入する
        </button>

        <div class="history">
            <h3>購入履歴（直近3回）</h3>
            ${historyHtml}
        </div>
    `;

    document.getElementById("modal").classList.remove("hidden");
}

function purchaseProduct(id) {
    const product = products.find(product => product.id === id);
    if (!product) return;

    const quantity = Number(document.getElementById("purchaseQuantity").value);

    if (!quantity || quantity <= 0) {
        alert("購入数を入力してください。");
        return;
    }

    product.stock += quantity;

    const now = new Date();
    const date =
        now.getFullYear() + "/" +
        String(now.getMonth() + 1).padStart(2, "0") + "/" +
        String(now.getDate()).padStart(2, "0");

    product.purchaseHistory.unshift({
        date,
        quantity
    });

    product.purchaseHistory = product.purchaseHistory.slice(0, 3);

    saveProducts();
    closeModal();
    renderAll();
}

function renderShoppingList() {
    const list = document.getElementById("shoppingList");

    const needToBuy = products.filter(product =>
        product.stock <= product.minimumStock
    );

    if (needToBuy.length === 0) {
        list.innerHTML = '<div class="empty-message">買うものはありません。</div>';
        return;
    }

    const groups = {};

    needToBuy.forEach(product => {
        if (!groups[product.shop]) groups[product.shop] = [];
        groups[product.shop].push(product);
    });

    list.innerHTML = Object.entries(groups).map(([shop, shopProducts]) => `
        <div class="shopping-group">
            <h3>${escapeHtml(shop)}</h3>
            ${shopProducts.map(product => `
                <div class="shopping-item">
                    <div class="shopping-item-header">
                        <div>
                            <strong>${escapeHtml(product.name)}</strong><br>
                            現在庫：${product.stock}
                        </div>
                        <button class="buy-button"
                            onclick="showProductDetail('${product.id}')">
                            買った
                        </button>
                    </div>
                </div>
            `).join("")}
        </div>
    `).join("");
}

function deleteProduct(id) {
    const product = products.find(product => product.id === id);
    if (!product) return;

    if (!confirm(`「${product.name}」を削除しますか？`)) return;

    products = products.filter(product => product.id !== id);
    saveProducts();
    renderAll();
}

document.getElementById("closeModal").addEventListener("click", closeModal);

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

document.getElementById("categoryFilter").addEventListener("change", renderInventory);
document.getElementById("searchInput").addEventListener("input", renderInventory);

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderAll() {
    renderInventory();
    renderShoppingList();
}

renderAll();
