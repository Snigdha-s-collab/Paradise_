#include "database.hpp"
#include <iostream>

Database::Database(const std::string& db_path) {
    if (sqlite3_open(db_path.c_str(), &db) != SQLITE_OK) {
        std::cerr << "Cannot open database: " << sqlite3_errmsg(db) << std::endl;
    }
}

Database::~Database() {
    sqlite3_close(db);
}

bool Database::execute_query(const std::string& query) {
    char* err_msg = 0;
    if (sqlite3_exec(db, query.c_str(), 0, 0, &err_msg) != SQLITE_OK) {
        std::cerr << "SQL error (" << query << "): " << err_msg << std::endl;
        sqlite3_free(err_msg);
        return false;
    }
    return true;
}

void Database::init_tables() {
    // During dev, clear schema for the new architecture requirements
    // For safety ensure we only do this when schema changes are forced (like now)
    execute_query("DROP TABLE IF EXISTS bookings;");
    execute_query("DROP TABLE IF EXISTS services;");
    execute_query("DROP TABLE IF EXISTS rooms;");
    execute_query("DROP TABLE IF EXISTS users;");

    const char* user_table = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
    )";
    execute_query(user_table);

    const char* room_table = R"(
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            has_ac INTEGER,
            price REAL,
            image_url TEXT,
            facilities TEXT,
            is_available INTEGER DEFAULT 1
        );
    )";
    execute_query(room_table);

    const char* service_table = R"(
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            description TEXT,
            image_url TEXT,
            price REAL
        );
    )";
    execute_query(service_table);

    const char* booking_table = R"(
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            room_id INTEGER,
            check_in TEXT,
            check_out TEXT,
            guests INTEGER,
            total_price REAL,
            food_package TEXT,
            services_booked TEXT,
            status TEXT DEFAULT 'Confirmed',
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(room_id) REFERENCES rooms(id)
        );
    )";
    execute_query(booking_table);
}

void Database::seed_data() {
    // Insert admin if not exists
    execute_query("INSERT OR IGNORE INTO users (name, email, phone, password, role) VALUES ('Admin', 'admin@hotel.com', '1234567890', 'admin123', 'admin');");
    execute_query("INSERT OR IGNORE INTO users (name, email, phone, password, role) VALUES ('John', 'john@gmail.com', '1234567890', 'john123', 'user');");
    
    // Seed Services with Description and Images
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, "SELECT count(*) FROM services", -1, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW && sqlite3_column_int(stmt, 0) == 0) {
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Swimming Pool Access', 'Enjoy our temperature controlled infinity pools.', 'https://images.unsplash.com/photo-1576013551627-c02082ae05d7?auto=format&fit=crop&q=80', 300)");
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Spa Access', 'Relaxing treatments with organic essentials.', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80', 1500)");
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Gym Access', 'Fully equipped state-of-the-art fitness center.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80', 200)");
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Movie Theatre', 'Private screening room for families.', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80', 500)");
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Cycling', 'Morning trails and bicycle rental.', 'https://images.unsplash.com/photo-1571333250630-f0230c1e8169?auto=format&fit=crop&q=80', 150)");
            execute_query("INSERT INTO services (name, description, image_url, price) VALUES ('Gardening Activity', 'Outdoor organic planting experience.', 'https://images.unsplash.com/photo-1416879598555-220b8bf970cc?auto=format&fit=crop&q=80', 100)");
        }
    }
    sqlite3_finalize(stmt);

    // Exact 45 Rooms
    if (sqlite3_prepare_v2(db, "SELECT count(*) FROM rooms", -1, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW && sqlite3_column_int(stmt, 0) == 0) {
            // 15 Single (5 Non-AC, 10 AC)
            for(int i=0; i<5; ++i) execute_query("INSERT INTO rooms (type, has_ac, price, image_url, facilities) VALUES ('Single', 0, 1000, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80', 'TV,WiFi')");
            for(int i=0; i<10; ++i) execute_query("INSERT INTO rooms (type, has_ac, price, image_url, facilities) VALUES ('Single', 1, 1500, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80', 'TV,WiFi,Shower,AC')");
            // 15 Double (5 Non-AC, 10 AC)
            for(int i=0; i<5; ++i) execute_query("INSERT INTO rooms (type, has_ac, price, image_url, facilities) VALUES ('Double', 0, 2000, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80', 'TV,WiFi,Shower,Balcony')");
            for(int i=0; i<10; ++i) execute_query("INSERT INTO rooms (type, has_ac, price, image_url, facilities) VALUES ('Double', 1, 2500, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80', 'TV,WiFi,Shower,AC,Balcony')");
            // 15 Suite (All AC)
            for(int i=0; i<15; ++i) execute_query("INSERT INTO rooms (type, has_ac, price, image_url, facilities) VALUES ('Suite', 1, 6000, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80', 'TV,WiFi,Shower,AC,Balcony,MiniBar,Living Room')");
        }
    }
    sqlite3_finalize(stmt);
}

bool Database::register_user(const User& user) {
    const char* query = "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, user.name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, user.email.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, user.phone.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, user.password.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, user.role.c_str(), -1, SQLITE_TRANSIENT);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

std::optional<User> Database::authenticate(const std::string& email, const std::string& password) {
    const char* query = "SELECT id, name, email, phone, role FROM users WHERE email = ? AND password = ?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, password.c_str(), -1, SQLITE_TRANSIENT);
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        User u;
        u.id = sqlite3_column_int(stmt, 0);
        u.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        u.email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
        u.phone = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
        u.role = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
        sqlite3_finalize(stmt);
        return u;
    }
    sqlite3_finalize(stmt);
    return std::nullopt;
}

std::vector<Room> Database::get_all_rooms() {
    std::vector<Room> rooms;
    const char* query = "SELECT id, type, has_ac, price, image_url, facilities, is_available FROM rooms";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Room r;
            r.id = sqlite3_column_int(stmt, 0);
            r.type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            r.has_ac = sqlite3_column_int(stmt, 2) != 0;
            r.price = sqlite3_column_double(stmt, 3);
            r.image_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            r.facilities = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            r.is_available = sqlite3_column_int(stmt, 6) != 0;
            rooms.push_back(r);
        }
    }
    sqlite3_finalize(stmt);
    return rooms;
}

std::optional<Room> Database::get_room(int id) {
    const char* query = "SELECT id, type, has_ac, price, image_url, facilities, is_available FROM rooms WHERE id = ?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, id);
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            Room r;
            r.id = sqlite3_column_int(stmt, 0);
            r.type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            r.has_ac = sqlite3_column_int(stmt, 2) != 0;
            r.price = sqlite3_column_double(stmt, 3);
            r.image_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            r.facilities = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            r.is_available = sqlite3_column_int(stmt, 6) != 0;
            sqlite3_finalize(stmt);
            return r;
        }
    }
    sqlite3_finalize(stmt);
    return std::nullopt;
}

std::optional<Room> Database::get_available_room(const std::string& type, bool has_ac, const std::string& check_in, const std::string& check_out) {
    const char* query = R"(
        SELECT id, type, has_ac, price, image_url, facilities FROM rooms 
        WHERE type = ? AND has_ac = ? AND is_available = 1
        AND id NOT IN (
            SELECT room_id FROM bookings 
            WHERE status != 'Cancelled' AND (check_in < ? AND check_out > ?)
        )
        LIMIT 1
    )";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_bind_text(stmt, 1, type.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 2, has_ac ? 1 : 0);
        sqlite3_bind_text(stmt, 3, check_out.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 4, check_in.c_str(), -1, SQLITE_TRANSIENT);
        
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            Room r;
            r.id = sqlite3_column_int(stmt, 0);
            r.type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            r.has_ac = sqlite3_column_int(stmt, 2) != 0;
            r.price = sqlite3_column_double(stmt, 3);
            r.image_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            r.facilities = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5));
            r.is_available = true;
            sqlite3_finalize(stmt);
            return r;
        }
    }
    sqlite3_finalize(stmt);
    return std::nullopt;
}


bool Database::add_room(const Room& room) {
    const char* query = "INSERT INTO rooms (type, has_ac, price, image_url, facilities, is_available) VALUES (?, ?, ?, ?, ?, ?)";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, room.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, room.has_ac ? 1 : 0);
    sqlite3_bind_double(stmt, 3, room.price);
    sqlite3_bind_text(stmt, 4, room.image_url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, room.facilities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 6, room.is_available ? 1 : 0);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

bool Database::edit_room(int id, const Room& room) {
    const char* query = "UPDATE rooms SET type=?, has_ac=?, price=?, image_url=?, facilities=?, is_available=? WHERE id=?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, room.type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, room.has_ac ? 1 : 0);
    sqlite3_bind_double(stmt, 3, room.price);
    sqlite3_bind_text(stmt, 4, room.image_url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, room.facilities.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 6, room.is_available ? 1 : 0);
    sqlite3_bind_int(stmt, 7, id);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

bool Database::delete_room(int id) {
    const char* query = "DELETE FROM rooms WHERE id=?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

std::vector<Service> Database::get_all_services() {
    std::vector<Service> services;
    const char* query = "SELECT id, name, description, image_url, price FROM services";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Service s;
            s.id = sqlite3_column_int(stmt, 0);
            s.name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
            s.description = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2));
            s.image_url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            s.price = sqlite3_column_double(stmt, 4);
            services.push_back(s);
        }
    }
    sqlite3_finalize(stmt);
    return services;
}

bool Database::update_service_price(int id, double price) {
    const char* query = "UPDATE services SET price=? WHERE id=?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_double(stmt, 1, price);
    sqlite3_bind_int(stmt, 2, id);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

bool Database::check_availability(int room_id, const std::string& check_in, const std::string& check_out) {
    const char* query = "SELECT COUNT(*) FROM bookings WHERE room_id = ? AND status != 'Cancelled' AND (check_in < ? AND check_out > ?)";
    sqlite3_stmt* stmt;
    bool available = false;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, room_id);
        sqlite3_bind_text(stmt, 2, check_out.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 3, check_in.c_str(), -1, SQLITE_TRANSIENT);
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            int overlapping = sqlite3_column_int(stmt, 0);
            available = (overlapping == 0);
        }
    }
    sqlite3_finalize(stmt);
    return available;
}

bool Database::create_booking(const Booking& booking) {
    const char* query = "INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, total_price, food_package, services_booked, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, booking.user_id);
    sqlite3_bind_int(stmt, 2, booking.room_id);
    sqlite3_bind_text(stmt, 3, booking.check_in.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, booking.check_out.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 5, booking.guests);
    sqlite3_bind_double(stmt, 6, booking.total_price);
    sqlite3_bind_text(stmt, 7, booking.food_package.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, booking.services_booked.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, booking.status.c_str(), -1, SQLITE_TRANSIENT);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

std::vector<Booking> Database::get_bookings_by_user(int user_id) {
    std::vector<Booking> bookings;
    const char* query = R"(
        SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests, b.total_price, b.food_package, b.services_booked, b.status, u.name, r.type
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.user_id = ?
        ORDER BY b.id DESC
    )";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        sqlite3_bind_int(stmt, 1, user_id);
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Booking b;
            b.id = sqlite3_column_int(stmt, 0);
            b.user_id = sqlite3_column_int(stmt, 1);
            b.room_id = sqlite3_column_int(stmt, 2);
            b.check_in = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            b.check_out = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            b.guests = sqlite3_column_int(stmt, 5);
            b.total_price = sqlite3_column_double(stmt, 6);
            b.food_package = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
            b.services_booked = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
            b.status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));
            b.customer_name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10));
            b.room_type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 11));
            bookings.push_back(b);
        }
    }
    sqlite3_finalize(stmt);
    return bookings;
}

std::vector<Booking> Database::get_all_bookings() {
    std::vector<Booking> bookings;
    const char* query = R"(
        SELECT b.id, b.user_id, b.room_id, b.check_in, b.check_out, b.guests, b.total_price, b.food_package, b.services_booked, b.status, u.name, r.type
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN rooms r ON b.room_id = r.id
        ORDER BY b.id DESC
    )";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) == SQLITE_OK) {
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            Booking b;
            b.id = sqlite3_column_int(stmt, 0);
            b.user_id = sqlite3_column_int(stmt, 1);
            b.room_id = sqlite3_column_int(stmt, 2);
            b.check_in = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3));
            b.check_out = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4));
            b.guests = sqlite3_column_int(stmt, 5);
            b.total_price = sqlite3_column_double(stmt, 6);
            b.food_package = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 7));
            b.services_booked = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8));
            b.status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9));
            b.customer_name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10));
            b.room_type = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 11));
            bookings.push_back(b);
        }
    }
    sqlite3_finalize(stmt);
    return bookings;
}

bool Database::update_booking_status(int booking_id, const std::string& status) {
    const char* query = "UPDATE bookings SET status=? WHERE id=?";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, query, -1, &stmt, NULL) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, booking_id);
    bool result = sqlite3_step(stmt) == SQLITE_DONE;
    sqlite3_finalize(stmt);
    return result;
}

json Database::get_dashboard_stats() {
    int total_bookings = 0;
    double revenue = 0.0;
    int available_rooms = 0;
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db, "SELECT COUNT(*) FROM bookings", -1, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) total_bookings = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);
    if (sqlite3_prepare_v2(db, "SELECT SUM(total_price) FROM bookings WHERE status='Confirmed'", -1, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) revenue = sqlite3_column_double(stmt, 0);
    }
    sqlite3_finalize(stmt);
    
    // Check available rooms today
    const char* q = R"(
        SELECT COUNT(*) FROM rooms 
        WHERE is_available = 1 AND id NOT IN (
            SELECT room_id FROM bookings WHERE status = 'Confirmed' AND check_in <= date('now') AND check_out >= date('now')
        )
    )";
    if (sqlite3_prepare_v2(db, q, -1, &stmt, NULL) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) available_rooms = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);
    return json{{"total_bookings", total_bookings}, {"revenue", revenue}, {"available_rooms", available_rooms}};
}
