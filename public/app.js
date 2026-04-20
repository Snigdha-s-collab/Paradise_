const API_BASE = "http://localhost:8085/api";

let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let allRooms = [];
let allServices = [];

// CART STATE
let cart = {
    room: null, // { type, has_ac, price, check_in, check_out, guests, food_name, food_price }
    services: [] // array of { id, name, price }
};

// Modals
const authModal = document.getElementById('auth-modal');
const bookingModal = document.getElementById('booking-modal');
const checkoutModal = document.getElementById('checkout-modal');
const cartDrawer = document.getElementById('cart-drawer');

document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    loadRooms();
    loadServices();
    setupEventListeners();
    showSection('hero-sec'); // Default to showing hero
});

function updateNav() {
    if (currentUser) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('my-bookings-btn').style.display = 'inline-block';
        if (currentUser.role === 'admin') document.getElementById('admin-btn').style.display = 'inline-block';
    } else {
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('my-bookings-btn').style.display = 'none';
        document.getElementById('admin-btn').style.display = 'none';
    }
}

function showSection(secId) {
    document.getElementById('hero-sec').style.display = (secId === 'hero-sec') ? 'flex' : 'none';
    document.getElementById('sec-rooms').style.display = (secId === 'rooms') ? 'block' : 'none';
    document.getElementById('sec-services').style.display = (secId === 'services') ? 'block' : 'none';
    document.body.style.overflow = (secId === 'hero-sec') ? 'hidden' : 'auto';
}

function toggleCart() {
    cartDrawer.classList.toggle('open');
    renderCart();
}

async function loadRooms() {
    try {
        const res = await fetch(`${API_BASE}/rooms`);
        allRooms = await res.json();
        const uniqueGroups = {};
        allRooms.forEach(r => {
            if (r.is_available) {
                const key = r.type + '_' + r.has_ac;
                if (!uniqueGroups[key]) {
                    uniqueGroups[key] = { ...r, available_count: 1 };
                } else {
                    uniqueGroups[key].available_count++;
                }
            }
        });
        renderRooms(Object.values(uniqueGroups));
    } catch (e) { console.error('Failed to load rooms'); }
}

async function loadServices() {
    try {
        const res = await fetch(`${API_BASE}/services`);
        allServices = await res.json();
        renderServices(allServices);
    } catch (e) { console.error('Failed to load services'); }
}

function renderRooms(rooms) {
    const grid = document.getElementById('rooms-grid');
    grid.innerHTML = '';
    rooms.forEach(room => {
        const facs = room.facilities.split(',').map(f => `<span class="badge">${f}</span>`).join('');
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${room.image_url}" alt="${room.type}">
            <div class="card-content">
                <h3>${room.type} Room ${room.has_ac ? '(AC)' : '(Non-AC)'}</h3>
                <p style="color:var(--primary); font-weight:bold; margin-bottom: 0.5rem;">${room.available_count} Available</p>
                <div class="card-price">₹${room.price} / night</div>
                <div style="margin-bottom: 1rem;">${facs}</div>
                <button class="btn-outline full-width" onclick="openRoomConfig('${room.type}', ${room.has_ac}, ${room.price}, '${room.image_url}', '${room.facilities}')">Configure & Add to Cart</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderServices(services) {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';
    services.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${s.image_url}" alt="${s.name}" style="height:150px;">
            <div class="card-content" style="padding:1rem;">
                <h4>${s.name}</h4>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:0.5rem;">${s.description}</p>
                <div class="card-price" style="font-size:1.1rem;">₹${s.price}</div>
                <button class="btn-outline full-width" onclick="addServiceToCart(${s.id}, '${s.name}', ${s.price})">Add to Cart</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ------ ROOM CART WORKFLOW ------
let tempRoomConfig = null;
function openRoomConfig(type, has_ac, base_price, img, facs) {
    tempRoomConfig = { type, has_ac, base_price };
    document.getElementById('modal-img').src = img;
    document.getElementById('modal-type').innerText = `${type} Room ${has_ac ? '(AC)' : '(Non-AC)'}`;
    document.getElementById('modal-price').innerText = `₹${base_price} / night base`;
    document.getElementById('modal-facilities').innerHTML = facs.split(',').map(f => `<span class="badge">${f}</span>`).join('');
    
    // reset form
    document.getElementById('add-room-form').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkin-date').value = today;
    let tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('checkout-date').value = tomorrow.toISOString().split('T')[0];

    bookingModal.style.display = 'flex';
}

function updateRoomPreviewPrice() {
    // optional dynamic label update
}

document.getElementById('add-room-form').onsubmit = (e) => {
    e.preventDefault();
    if (cart.room) {
        if (!confirm("You already have a room in the cart. Replace it?")) return;
    }
    const cin = document.getElementById('checkin-date').value;
    const cout = document.getElementById('checkout-date').value;
    if (cin >= cout) { alert("Check-out must be after check-in."); return; }

    const foodVal = document.getElementById('food-package').value.split('|');
    cart.room = {
        type: tempRoomConfig.type,
        has_ac: tempRoomConfig.has_ac,
        base_price: tempRoomConfig.base_price,
        check_in: cin,
        check_out: cout,
        guests: parseInt(document.getElementById('guests-count').value),
        food_name: foodVal[0],
        food_price: parseFloat(foodVal[1])
    };
    
    bookingModal.style.display = 'none';
    renderCart();
    cartDrawer.classList.add('open');
};

// ------ SERVICE CART WORKFLOW ------
function addServiceToCart(id, name, price) {
    if (cart.services.find(s => s.id === id)) {
        alert("Service already in cart!");
        return;
    }
    cart.services.push({id, name, price});
    renderCart();
    cartDrawer.classList.add('open');
}

function removeServiceFromCart(id) {
    cart.services = cart.services.filter(s => s.id !== id);
    renderCart();
}

function removeRoomFromCart() {
    cart.room = null;
    renderCart();
}

// ------ CART RENDERING ------
function renderCart() {
    let total = 0;
    const rC = document.getElementById('cart-room-container');
    if (cart.room) {
        const cin = new Date(cart.room.check_in);
        const cout = new Date(cart.room.check_out);
        let days = Math.ceil(Math.abs(cout - cin) / (1000 * 60 * 60 * 24));
        if (days <= 0 || isNaN(days)) days = 1;

        const rPrice = cart.room.base_price * days;
        const fPrice = cart.room.food_price * days;
        total += rPrice + fPrice;

        rC.innerHTML = `
            <div class="cart-item">
                <button class="cart-rm-btn" onclick="removeRoomFromCart()">Remove</button>
                <h4>${cart.room.type} Room ${cart.room.has_ac ? '(AC)' : ''}</h4>
                <p style="font-size:0.9rem; color:var(--text-muted);">${cart.room.check_in} to ${cart.room.check_out} (${days} nights)</p>
                <div style="display:flex; justify-content:space-between; margin-top:0.5rem;">
                    <span>Room:</span><span>₹${rPrice}</span>
                </div>
                ${cart.room.food_name !== 'None' ? `
                <div style="display:flex; justify-content:space-between;">
                    <span>Food (${cart.room.food_name}):</span><span>₹${fPrice}</span>
                </div>` : ''}
            </div>
        `;
    } else {
        rC.innerHTML = `<p style="color:var(--text-muted); font-style:italic;">No room selected</p>`;
    }

    const sC = document.getElementById('cart-services-container');
    sC.innerHTML = '';
    if (cart.services.length === 0) sC.innerHTML = `<p style="color:var(--text-muted); font-style:italic;">No add-on services selected</p>`;
    else {
        cart.services.forEach(s => {
            total += s.price;
            sC.innerHTML += `
                <div class="cart-item" style="padding:0.5rem 1rem;">
                    <button class="cart-rm-btn" style="top:50%; transform:translateY(-50%);" onclick="removeServiceFromCart(${s.id})">X</button>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${s.name}</span>
                        <span style="margin-right: 1.5rem;">₹${s.price}</span>
                    </div>
                </div>
            `;
        });
    }

    document.getElementById('cart-total-price').innerText = `₹${total}`;
    document.getElementById('cart-badge').innerText = (cart.room ? 1 : 0) + cart.services.length;
}

// ------ CHECKOUT WORKFLOW ------
function checkout() {
    if (!cart.room) {
        alert("You must have a room in the cart to checkout!");
        return;
    }
    if (!currentUser) {
        alert("Please login first!");
        cartDrawer.classList.remove('open');
        authModal.style.display = 'flex';
        return;
    }
    cartDrawer.classList.remove('open');
    document.getElementById('checkout-total').innerText = document.getElementById('cart-total-price').innerText;
    checkoutModal.style.display = 'flex';
}

document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('confirm-book-btn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    // Calculate total precisely
    const cin = new Date(cart.room.check_in); const cout = new Date(cart.room.check_out);
    let days = Math.ceil(Math.abs(cout - cin) / (1000 * 60 * 60 * 24));
    let totalAmount = (cart.room.base_price * days) + (cart.room.food_price * days);
    let srvIds = [];
    cart.services.forEach(s => { totalAmount += s.price; srvIds.push(s.id); });

    setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: currentUser.id,
                    room_type: cart.room.type,
                    has_ac: cart.room.has_ac,
                    check_in: cart.room.check_in,
                    check_out: cart.room.check_out,
                    guests: cart.room.guests,
                    total_price: totalAmount,
                    food_package: cart.room.food_name,
                    services_booked: srvIds
                })
            });
            const data = await res.json();
            btn.innerText = "Pay & Confirm Booking";
            btn.disabled = false;

            if (res.ok) {
                alert(`Payment successful! Booking confirmed for physical Room #${data.room_id}`);
                cart = { room: null, services: [] };
                renderCart();
                checkoutModal.style.display = 'none';
                document.getElementById('my-bookings-btn').click();
            } else {
                alert(`Booking failed: ${data.error}`);
            }
        } catch(e) {
            alert("Error communicating with server.");
            btn.innerText = "Pay & Confirm Booking";
            btn.disabled = false;
        }
    }, 1500);
}

// ------ AUTH / EVENT LISTENERS ------
function setupEventListeners() {
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = function() { this.closest('.modal').style.display = 'none'; }
    });

    document.getElementById('logout-btn').onclick = () => {
        localStorage.removeItem('user'); currentUser = null; updateNav(); window.location.reload();
    };

    document.getElementById('my-bookings-btn').onclick = async () => {
        if (!currentUser) return;
        document.getElementById('my-bookings-modal').style.display = 'flex';
        try {
            const res = await fetch(`${API_BASE}/bookings/user/${currentUser.id}`);
            const data = await res.json();
            const container = document.getElementById('user-bookings-list');
            container.innerHTML = data.length === 0 ? '<p>No bookings found.</p>' : '';
            data.forEach(b => {
                let s_txt = b.services_booked === "[]" ? "None" : "Included";
                container.innerHTML += `
                    <div class="card" style="margin-bottom:1rem; padding:1rem;">
                        <h3>Booking #${b.id} - ${b.room_type} Room</h3>
                        <p>Dates: ${b.check_in} to ${b.check_out} | Guests: ${b.guests}</p>
                        <p>Food: ${b.food_package} | Services: ${s_txt}</p>
                        <p style="color:var(--primary); font-size:1.1rem; font-weight:bold;">Total Paid: ₹${b.total_price}</p>
                        <p>Status: <strong>${b.status}</strong></p>
                    </div>
                `;
            });
        } catch(e) {}
    };

    // Auth flows
    document.getElementById('login-btn').onclick = () => authModal.style.display = 'flex';
    document.getElementById('tab-login').onclick = () => { document.getElementById('login-form').style.display = 'block'; document.getElementById('signup-form').style.display = 'none'; document.getElementById('tab-login').className = 'active'; document.getElementById('tab-signup').className = ''; }
    document.getElementById('tab-signup').onclick = () => { document.getElementById('login-form').style.display = 'none'; document.getElementById('signup-form').style.display = 'block'; document.getElementById('tab-login').className = ''; document.getElementById('tab-signup').className = 'active'; }
    
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST', body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value })
            });
            const data = await res.json();
            if (res.ok) { currentUser = data.user; localStorage.setItem('user', JSON.stringify(currentUser)); updateNav(); authModal.style.display = 'none'; } 
            else alert(data.error);
        } catch(e) {}
    };
    // Signup omit for brevity logic equivalent to last step...
}
