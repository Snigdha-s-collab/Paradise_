const API_BASE = "http://localhost:8085/api";
let currentUser = JSON.parse(localStorage.getItem('user'));

// Check admin
if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    
    // Close modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = function() {
            this.closest('.modal').style.display = 'none';
        }
    });

    document.getElementById('add-room-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            const body = {
                type: document.getElementById('room-type').value,
                has_ac: document.getElementById('room-ac').value === "1",
                price: parseFloat(document.getElementById('room-price').value),
                facilities: document.getElementById('room-facilities').value,
                is_available: true
            };
            const id = document.getElementById('edit-room-id').value;
            // Simplified: just POSTing new room for now as per minimal requirment
            // Real edit would be a PUT method
            const res = await fetch(`${API_BASE}/rooms`, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert('Room added successfully');
                document.getElementById('add-room-modal').style.display = 'none';
                loadRooms();
            } else {
                alert('Failed to add room');
            }
        } catch(e) { alert("Server error"); }
    };
});

function showSection(id) {
    document.getElementById('sec-dashboard').style.display = 'none';
    document.getElementById('sec-rooms').style.display = 'none';
    document.getElementById('sec-bookings').style.display = 'none';
    
    document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById(`sec-${id}`).style.display = 'block';

    if (id === 'dashboard') loadDashboard();
    if (id === 'rooms') loadRooms();
    if (id === 'bookings') loadBookings();
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const stats = await res.json();
        document.getElementById('stat-bookings').innerText = stats.total_bookings;
        document.getElementById('stat-revenue').innerText = stats.revenue;
        document.getElementById('stat-rooms').innerText = stats.available_rooms;
    } catch(e) { console.error(e) }
}

async function loadRooms() {
    try {
        const res = await fetch(`${API_BASE}/rooms`);
        const rooms = await res.json();
        const tbody = document.getElementById('rooms-tbody');
        tbody.innerHTML = '';
        rooms.forEach(r => {
            tbody.innerHTML += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.type} ${r.has_ac ? '(AC)' : ''}</td>
                    <td>₹${r.price}</td>
                    <td>${r.facilities}</td>
                    <td>${r.is_available ? 'Yes' : 'No'}</td>
                    <td>
                        <button class="btn-outline" style="padding: 0.2rem 0.5rem;" onclick="deleteRoom(${r.id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch(e) { console.error(e) }
}

async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
        const res = await fetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE' });
        if (res.ok) loadRooms();
        else alert('Error deleting room');
    } catch(e) { alert('Server error'); }
}

async function loadBookings() {
    try {
        const res = await fetch(`${API_BASE}/bookings`);
        const bookings = await res.json();
        const tbody = document.getElementById('bookings-tbody');
        tbody.innerHTML = '';
        bookings.forEach(b => {
            const isCancelled = b.status === 'Cancelled';
            tbody.innerHTML += `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.customer_name}</td>
                    <td>${b.room_type} (#${b.room_id})</td>
                    <td>${b.check_in} to ${b.check_out}</td>
                    <td>${b.food_package}</td>
                    <td>₹${b.total_price}</td>
                    <td class="${isCancelled ? 'text-danger' : 'text-success'}">${b.status}</td>
                    <td>
                        ${!isCancelled ? `<button class="btn-outline" style="padding: 0.2rem 0.5rem; color: var(--danger); border-color: var(--danger);" onclick="cancelBooking(${b.id})">Cancel</button>` : 'Canceled'}
                    </td>
                </tr>
            `;
        });
    } catch(e) { console.error(e) }
}

async function cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel booking #'+id+'?')) return;
    try {
        const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Cancelled' })
        });
        if (res.ok) loadBookings();
        else alert('Error cancelling booking');
    } catch(e) { alert('Server error'); }
}
