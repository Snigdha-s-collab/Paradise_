#pragma once
#include "sqlite3.h"
#include "models.hpp"
#include <vector>
#include <optional>
#include <string>

class Database {
private:
    sqlite3* db;
    bool execute_query(const std::string& query);
    
public:
    Database(const std::string& db_path);
    ~Database();
    
    void init_tables();
    void seed_data();
    
    // User Methods
    bool register_user(const User& user);
    std::optional<User> authenticate(const std::string& email, const std::string& password);
    
    // Room Methods
    std::vector<Room> get_all_rooms();
    std::optional<Room> get_room(int id);
    std::optional<Room> get_available_room(const std::string& type, bool has_ac, const std::string& check_in, const std::string& check_out);
    bool add_room(const Room& room);
    bool edit_room(int id, const Room& room);
    bool delete_room(int id);
    
    // Service Methods
    std::vector<Service> get_all_services();
    bool update_service_price(int id, double price);
    
    // Booking Methods
    bool check_availability(int room_id, const std::string& check_in, const std::string& check_out);
    bool create_booking(const Booking& booking);
    std::vector<Booking> get_bookings_by_user(int user_id);
    std::vector<Booking> get_all_bookings();
    bool update_booking_status(int booking_id, const std::string& status);

    // Dashboard Stats
    json get_dashboard_stats();
};
