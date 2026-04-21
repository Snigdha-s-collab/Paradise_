const API_BASE = "http://localhost:8085/api";

let currentUser = JSON.parse(localStorage.getItem('user')) || null;
let allRooms = [];
let allServices = [];

// CART STATE
let cart = {
    rooms: [], // array of { type, has_ac, base_price, check_in, check_out, guests, food_name, food_price }
    services: [] // array of { id, name, price }
};

function loadCart() {
    if (currentUser && currentUser.email) {
        const saved = localStorage.getItem('cart_' + currentUser.email);
        if (saved) cart = JSON.parse(saved);
        else cart = { rooms: [], services: [] };
    } else {
        cart = { rooms: [], services: [] };
    }
}

function saveCart() {
    if (currentUser && currentUser.email) {
        localStorage.setItem('cart_' + currentUser.email, JSON.stringify(cart));
    }
}

// Modals
const bookingModal = document.getElementById('booking-modal');
const checkoutModal = document.getElementById('checkout-modal');
const cartDrawer = document.getElementById('cart-drawer');

document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    loadRooms();
    loadServices();
    setupEventListeners();
    
    if (currentUser) {
        loadCart();
        document.getElementById('main-navbar').style.display = 'flex';
        showSection('hero-sec');
    } else {
        document.getElementById('main-navbar').style.display = 'none';
        showSection('auth');
    }
});

function updateNav() {
    if (currentUser) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-dropdown').style.display = 'inline-block';
        document.getElementById('user-header-name').innerText = currentUser.name.split(' ')[0];
        document.getElementById('my-bookings-btn').style.display = 'inline-block';
        if (currentUser.role === 'admin') document.getElementById('admin-btn').style.display = 'inline-block';
    } else {
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('user-dropdown').style.display = 'none';
        document.getElementById('my-bookings-btn').style.display = 'none';
        document.getElementById('admin-btn').style.display = 'none';
    }
}

function showSection(secId) {
    document.getElementById('sec-auth').style.display = (secId === 'auth') ? 'flex' : 'none';
    document.getElementById('hero-sec').style.display = (secId === 'hero-sec') ? 'flex' : 'none';
    document.getElementById('sec-rooms').style.display = (secId === 'rooms') ? 'block' : 'none';
    document.getElementById('sec-services').style.display = (secId === 'services') ? 'block' : 'none';
    document.body.style.overflow = (secId === 'hero-sec' || secId === 'auth') ? 'hidden' : 'auto';
}

function toggleCart() {
    cartDrawer.classList.toggle('open');
    renderCart();
}

async function loadRooms() {
    try {
        const res = await fetch(`${API_BASE}/rooms`);
        allRooms = await res.json();
        applyFilters();
    } catch (e) { console.error('Failed to load rooms'); }
}

function applyFilters() {
    const typeFilter = document.getElementById('filter-type').value;
    const acFilter = document.getElementById('filter-ac').value;
    const sortVal = document.getElementById('sort-price').value;

    let filtered = allRooms.filter(r => r.is_available);

    if (typeFilter !== 'All') {
        filtered = filtered.filter(r => r.type === typeFilter);
    }
    
    if (acFilter !== 'All') {
        const wantsAc = (acFilter === 'AC');
        filtered = filtered.filter(r => r.has_ac === wantsAc);
    }

    const uniqueGroups = {};
    filtered.forEach(r => {
        const key = r.type + '_' + r.has_ac;
        if (!uniqueGroups[key]) {
            uniqueGroups[key] = { ...r, available_count: 1 };
        } else {
            uniqueGroups[key].available_count++;
        }
    });

    let result = Object.values(uniqueGroups);

    if (sortVal === 'asc') {
        result.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'desc') {
        result.sort((a, b) => b.price - a.price);
    }

    renderRooms(result);
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
    const cin = document.getElementById('checkin-date').value;
    const cout = document.getElementById('checkout-date').value;
    if (cin >= cout) { alert("Check-out must be after check-in."); return; }

    const foodVal = document.getElementById('food-package').value.split('|');
    cart.rooms.push({
        type: tempRoomConfig.type,
        has_ac: tempRoomConfig.has_ac,
        base_price: tempRoomConfig.base_price,
        check_in: cin,
        check_out: cout,
        guests: parseInt(document.getElementById('guests-count').value),
        food_name: foodVal[0],
        food_price: parseFloat(foodVal[1])
    });
    
    saveCart();
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
    saveCart();
    renderCart();
    cartDrawer.classList.add('open');
}

function removeServiceFromCart(id) {
    cart.services = cart.services.filter(s => s.id !== id);
    saveCart();
    renderCart();
}

function removeRoomFromCart(index) {
    cart.rooms.splice(index, 1);
    saveCart();
    renderCart();
}

// ------ CART RENDERING ------
function renderCart() {
    let total = 0;
    const rC = document.getElementById('cart-room-container');
    rC.innerHTML = '';
    
    if (cart.rooms.length > 0) {
        cart.rooms.forEach((rm, index) => {
            const cin = new Date(rm.check_in);
            const cout = new Date(rm.check_out);
            let days = Math.ceil(Math.abs(cout - cin) / (1000 * 60 * 60 * 24));
            if (days <= 0 || isNaN(days)) days = 1;

            const rPrice = rm.base_price * days;
            const fPrice = rm.food_price * days;
            total += rPrice + fPrice;

            rC.innerHTML += `
                <div class="cart-item">
                    <button class="cart-rm-btn" onclick="removeRoomFromCart(${index})">Remove</button>
                    <h4>${rm.type} Room ${rm.has_ac ? '(AC)' : ''}</h4>
                    <p style="font-size:0.9rem; color:var(--text-muted);">${rm.check_in} to ${rm.check_out} (${days} nights)</p>
                    <div style="display:flex; justify-content:space-between; margin-top:0.5rem;">
                        <span>Room:</span><span>₹${rPrice}</span>
                    </div>
                    ${rm.food_name !== 'None' ? `
                    <div style="display:flex; justify-content:space-between;">
                        <span>Food (${rm.food_name}):</span><span>₹${fPrice}</span>
                    </div>` : ''}
                </div>
            `;
        });
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
    document.getElementById('cart-badge').innerText = cart.rooms.length + cart.services.length;
}

// ------ CHECKOUT WORKFLOW ------
function checkout() {
    if (cart.rooms.length === 0) {
        alert("You must have at least one room in the cart to checkout!");
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

    let srvIds = cart.services.map(s => s.id);

    try {
        let hasError = false;
        let lastErrorMsg = "";
        
        for (let i = 0; i < cart.rooms.length; i++) {
            let rm = cart.rooms[i];
            let cin = new Date(rm.check_in); let cout = new Date(rm.check_out);
            let days = Math.ceil(Math.abs(cout - cin) / (1000 * 60 * 60 * 24));
            if (days <= 0 || isNaN(days)) days = 1;
            
            let rmTotal = (rm.base_price * days) + (rm.food_price * days);
            if (i === 0) {
                cart.services.forEach(s => rmTotal += s.price);
            }

            const res = await fetch(`${API_BASE}/bookings`, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: currentUser.id,
                    room_type: rm.type,
                    has_ac: rm.has_ac,
                    check_in: rm.check_in,
                    check_out: rm.check_out,
                    guests: rm.guests,
                    total_price: rmTotal,
                    food_package: rm.food_name,
                    services_booked: (i === 0) ? srvIds : []
                })
            });
            const data = await res.json();
            if (!res.ok) {
                hasError = true;
                lastErrorMsg = data.error;
            }
        }

        btn.innerText = "Pay & Confirm Booking";
        btn.disabled = false;

        if (!hasError) {
            alert(`Payment successful! Bookings confirmed.`);
            cart = { rooms: [], services: [] };
            saveCart();
            renderCart();
            checkoutModal.style.display = 'none';
            document.getElementById('my-bookings-btn').click();
        } else {
            alert(`Booking partial or failed: ${lastErrorMsg}`);
        }
    } catch(e) {
        alert("Error communicating with server.");
        btn.innerText = "Pay & Confirm Booking";
        btn.disabled = false;
    }
}

// ------ AUTH / EVENT LISTENERS ------
function setupEventListeners() {
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = function() { this.closest('.modal').style.display = 'none'; }
    });
    
    // Filter bindings
    document.getElementById('filter-type').onchange = applyFilters;
    document.getElementById('filter-ac').onchange = applyFilters;
    document.getElementById('sort-price').onchange = applyFilters;

    document.getElementById('logout-btn').onclick = () => {
        localStorage.removeItem('user'); 
        currentUser = null; 
        cart = { rooms: [], services: [] };
        updateNav(); 
        window.location.reload();
    };
    
    document.getElementById('help-btn').onclick = (e) => {
        e.preventDefault();
        window.location.href = 'help.html';
    };
    
    document.getElementById('user-dropdown-btn').onclick = (e) => {
        e.stopPropagation();
        document.querySelector('.dropdown-content').classList.toggle('show');
    };
    window.addEventListener('click', (e) => {
        if (!e.target.closest('#user-dropdown')) {
            document.querySelector('.dropdown-content').classList.remove('show');
        }
    });

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
                let cancelBtn = "";
                if (b.status !== 'Cancelled' && b.created_at) {
                    // Check if < 48h from booking created_at time
                    // SQLite CURRENT_TIMESTAMP is UTC
                    let createdDate = new Date(b.created_at + "Z");
                    let hoursSinceCreation = (new Date() - createdDate) / (1000 * 60 * 60);
                    if (hoursSinceCreation <= 48) {
                        cancelBtn = `<button class="btn-outline text-danger cancel-btn" data-id="${b.id}" style="padding:0.2rem 0.6rem; margin-top:0.5rem;">Cancel Booking</button>`;
                    }
                }

                container.innerHTML += `
                    <div class="card" style="margin-bottom:1rem; padding:1rem;">
                        <h3>Booking #${b.id} - ${b.room_type} Room</h3>
                        <p>Dates: ${b.check_in} to ${b.check_out} | Guests: ${b.guests}</p>
                        <p>Food: ${b.food_package} | Services: ${s_txt}</p>
                        <p style="color:var(--primary); font-size:1.1rem; font-weight:bold;">Total Paid: ₹${b.total_price}</p>
                        <p>Status: <strong class="${b.status === 'Cancelled' ? 'text-danger' : 'text-success'}">${b.status}</strong></p>
                        ${cancelBtn}
                    </div>
                `;
            });
            
            // Explicitly bind click events for strict CSP bypassing
            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.preventDefault();
                    let bookingId = e.target.getAttribute('data-id');
                    let answer = confirm("Do you want to cancel your bookings?");
                    if (!answer) return;
                    
                    try {
                        const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, { 
                            method: 'PUT', 
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({status: 'Cancelled'}) 
                        });
                        if (res.ok) {
                            alert('Booking successfully cancelled.');
                            document.getElementById('my-bookings-btn').click();
                        } else {
                            alert('Could not cancel the booking at this time.');
                        }
                    } catch(err) { alert('Network error'); }
                };
            });
            
        } catch(e) {}
    };

    // Auth flows
    document.getElementById('tab-login').onclick = () => { document.getElementById('login-form').style.display = 'block'; document.getElementById('signup-form').style.display = 'none'; document.getElementById('tab-login').className = 'active'; document.getElementById('tab-signup').className = ''; }
    document.getElementById('tab-signup').onclick = () => { document.getElementById('login-form').style.display = 'none'; document.getElementById('signup-form').style.display = 'block'; document.getElementById('tab-login').className = ''; document.getElementById('tab-signup').className = 'active'; }
    
    document.getElementById('btn-login-submit').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        if (!email || !pass) return alert("Please enter both email and password.");
        
        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST', body: JSON.stringify({ email: email, password: pass })
            });
            const data = await res.json();
            if (res.ok) { 
                currentUser = data.user; 
                localStorage.setItem('user', JSON.stringify(currentUser)); 
                loadCart();
                updateNav(); 
                document.getElementById('main-navbar').style.display = 'flex';
                showSection('hero-sec');
            } else {
                alert(data.error || "Login failed.");
            }
        } catch(e) { alert("Network error. Please try again."); }
    };
    
    document.getElementById('btn-signup-submit').onclick = async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const phone = document.getElementById('signup-phone').value;
        const password = document.getElementById('signup-password').value;
        if (!name || !email || !password) return alert("Please fill in name, email, and password.");
        
        try {
            const res = await fetch(`${API_BASE}/register`, {
                method: 'POST', body: JSON.stringify({ 
                    name: name,
                    email: email,
                    phone: phone,
                    password: password 
                })
            });
            const data = await res.json();
            if (res.ok) { 
                const loginRes = await fetch(`${API_BASE}/login`, {
                    method: 'POST', body: JSON.stringify({ email, password })
                });
                const loginData = await loginRes.json();
                currentUser = loginData.user;
                localStorage.setItem('user', JSON.stringify(currentUser));
                loadCart();
                updateNav();
                document.getElementById('main-navbar').style.display = 'flex';
                showSection('rooms');
            } else {
                alert(data.error || "Sign up failed.");
            }
        } catch(e) { alert("Network error. Please try again."); }
    };
}
