const STORAGE_KEY = "foodCompanyState";

function createId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn("randomUUID 생성에 실패했습니다.", error);
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(4);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(8, "0")).join("-").slice(0, 36);
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

const defaultState = {
  inventory: [
    { id: createId(), name: "유기농 사과", category: "과일", stock: 240, price: 1800 },
    { id: createId(), name: "저염 김치", category: "절임", stock: 120, price: 4200 },
    { id: createId(), name: "두부", category: "냉장", stock: 320, price: 1300 }
  ],
  orders: [
    {
      id: createId(),
      name: "이마트 광명점 납품",
      owner: "박미정",
      deadline: new Date().toISOString().slice(0, 10),
      status: "진행중"
    },
    {
      id: createId(),
      name: "온라인몰 6월 프로모션",
      owner: "김수현",
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "보류"
    }
  ],
  suppliers: [
    {
      id: createId(),
      name: "그린팜 농산",
      contact: "이종현",
      phone: "02-1234-5678",
      items: "신선 과일"
    },
    {
      id: createId(),
      name: "맑은샘 식품",
      contact: "최하나",
      phone: "031-987-6543",
      items: "소스, 드레싱"
    }
  ]
};

const state = loadState();

const productForm = document.getElementById("product-form");
const orderForm = document.getElementById("order-form");
const supplierForm = document.getElementById("supplier-form");
const inventoryBody = document.getElementById("inventory-body");
const orderBody = document.getElementById("order-body");
const supplierBody = document.getElementById("supplier-body");
const statusFilter = document.getElementById("status-filter");
const toast = document.getElementById("toast");

renderInventory();
renderOrders();
renderSuppliers();

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value.trim();
  const stock = Number(document.getElementById("product-stock").value);
  const price = Number(document.getElementById("product-price").value);

  if (!name || !category || Number.isNaN(stock) || Number.isNaN(price)) {
    showToast("입력값을 확인해주세요.");
    return;
  }

  state.inventory.unshift({ id: createId(), name, category, stock, price });
  saveState();
  renderInventory();
  productForm.reset();
  showToast(`${name} 제품이 추가되었습니다.`);
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("order-name").value.trim();
  const owner = document.getElementById("order-owner").value.trim();
  const deadline = document.getElementById("order-deadline").value;
  const status = document.getElementById("order-status").value;

  if (!name || !owner || !deadline) {
    showToast("모든 필드를 입력해주세요.");
    return;
  }

  state.orders.unshift({ id: createId(), name, owner, deadline, status });
  saveState();
  renderOrders();
  orderForm.reset();
  showToast(`${name} 주문이 등록되었습니다.`);
});

supplierForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("supplier-name").value.trim();
  const contact = document.getElementById("supplier-contact").value.trim();
  const phone = document.getElementById("supplier-phone").value.trim();
  const items = document.getElementById("supplier-items").value.trim();

  if (!name || !contact || !phone || !items) {
    showToast("모든 필드를 입력해주세요.");
    return;
  }

  state.suppliers.unshift({ id: createId(), name, contact, phone, items });
  saveState();
  renderSuppliers();
  supplierForm.reset();
  showToast(`${name} 공급업체가 추가되었습니다.`);
});

statusFilter.addEventListener("change", () => {
  renderOrders();
});

inventoryBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { id, action } = button.dataset;
  if (!id || !action) return;

  const product = state.inventory.find((item) => item.id === id);
  if (!product) return;

  switch (action) {
    case "adjust":
      handleStockAdjust(product);
      break;
    case "remove":
      state.inventory = state.inventory.filter((item) => item.id !== id);
      saveState();
      renderInventory();
      showToast(`${product.name} 제품이 삭제되었습니다.`);
      break;
  }
});

orderBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { id, action } = button.dataset;
  if (!id || !action) return;

  const order = state.orders.find((item) => item.id === id);
  if (!order) return;

  if (action === "cycle") {
    const statusList = ["진행중", "출고완료", "보류"];
    const nextIndex = (statusList.indexOf(order.status) + 1) % statusList.length;
    order.status = statusList[nextIndex];
    saveState();
    renderOrders();
    showToast(`${order.name} 상태가 '${order.status}'(으)로 변경되었습니다.`);
  } else if (action === "remove") {
    state.orders = state.orders.filter((item) => item.id !== id);
    saveState();
    renderOrders();
    showToast(`${order.name} 주문이 삭제되었습니다.`);
  }
});

supplierBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const { id } = button.dataset;
  if (!id) return;

  const supplier = state.suppliers.find((item) => item.id === id);
  if (!supplier) return;

  state.suppliers = state.suppliers.filter((item) => item.id !== id);
  saveState();
  renderSuppliers();
  showToast(`${supplier.name} 공급업체가 삭제되었습니다.`);
});

function renderInventory() {
  if (state.inventory.length === 0) {
    inventoryBody.innerHTML = `<tr><td colspan="6" class="empty-message">등록된 제품이 없습니다.</td></tr>`;
    return;
  }

  inventoryBody.innerHTML = state.inventory
    .map((item) => {
      const stockValue = (item.stock * item.price).toLocaleString();
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.stock.toLocaleString()}</td>
          <td>₩ ${item.price.toLocaleString()}</td>
          <td>₩ ${stockValue}</td>
          <td>
            <button class="link" data-action="adjust" data-id="${item.id}">재고 조정</button>
            <button class="link" data-action="remove" data-id="${item.id}">삭제</button>
          </td>
        </tr>`;
    })
    .join("");
}

function renderOrders() {
  const filter = statusFilter.value;
  const filtered =
    filter === "all" ? state.orders : state.orders.filter((order) => order.status === filter);

  if (filtered.length === 0) {
    orderBody.innerHTML = `<tr><td colspan="5" class="empty-message">조건에 맞는 주문이 없습니다.</td></tr>`;
    return;
  }

  orderBody.innerHTML = filtered
    .map((order) => `
      <tr>
        <td>${order.name}</td>
        <td>${order.owner}</td>
        <td>${formatDate(order.deadline)}</td>
        <td><span class="status-pill" data-status="${order.status}">${order.status}</span></td>
        <td>
          <button class="link" data-action="cycle" data-id="${order.id}">상태 변경</button>
          <button class="link" data-action="remove" data-id="${order.id}">삭제</button>
        </td>
      </tr>`)
    .join("");
}

function renderSuppliers() {
  if (state.suppliers.length === 0) {
    supplierBody.innerHTML = `<tr><td colspan="5" class="empty-message">등록된 공급업체가 없습니다.</td></tr>`;
    return;
  }

  supplierBody.innerHTML = state.suppliers
    .map(
      (supplier) => `
        <tr>
          <td>${supplier.name}</td>
          <td>${supplier.contact}</td>
          <td>${supplier.phone}</td>
          <td>${supplier.items}</td>
          <td><button class="link" data-id="${supplier.id}">삭제</button></td>
        </tr>`
    )
    .join("");
}

function handleStockAdjust(product) {
  const value = prompt(`${product.name} 재고 조정 수량을 입력하세요. (예: +50 또는 -20)`, "");
  if (value === null) return;

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    showToast("숫자를 입력해주세요.");
    return;
  }

  const newStock = product.stock + amount;
  if (newStock < 0) {
    showToast("재고는 0보다 작을 수 없습니다.");
    return;
  }

  product.stock = newStock;
  saveState();
  renderInventory();
  const action = amount >= 0 ? "증가" : "감소";
  showToast(`${product.name} 재고가 ${Math.abs(amount)}만큼 ${action}했습니다.`);
}

function formatDate(date) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${year}.${month}.${day}`;
}

let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function saveState() {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("상태 저장에 실패했습니다.", error);
  }
}

function loadState() {
  if (typeof localStorage === "undefined") {
    return cloneDefaultState();
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        inventory: parsed.inventory?.map((item) => ({ ...item, id: item.id ?? createId() })) ?? [],
        orders: parsed.orders?.map((item) => ({ ...item, id: item.id ?? createId() })) ?? [],
        suppliers: parsed.suppliers?.map((item) => ({ ...item, id: item.id ?? createId() })) ?? []
      };
    }
  } catch (error) {
    console.warn("상태 불러오기에 실패했습니다.", error);
  }

  return cloneDefaultState();
}

function cloneDefaultState() {
  return {
    inventory: defaultState.inventory.map((item) => ({ ...item })),
    orders: defaultState.orders.map((item) => ({ ...item })),
    suppliers: defaultState.suppliers.map((item) => ({ ...item }))
  };
}
