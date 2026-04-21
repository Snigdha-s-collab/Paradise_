#pragma once
#include <string>
#include "json.hpp"

using json = nlohmann::json;

struct User {
    int id;
    std::string name;
    std::string email;
    std::string phone;
    std::string password;
    std::string role; // "user", "admin"
    
    json to_json() const {
        return json{{"id", id}, {"name", name}, {"email", email}, {"phone", phone}, {"role", role}};
    }
};

struct Room {
    int id;
    std::string type; // "Single", "Double", "Suite"
    bool has_ac;
    double price;
    std::string image_url;
    std::string facilities; // Comma separated like: "TV,WiFi,Shower"
    bool is_available;
    
    json to_json() const {
        return json{{"id", id}, {"type", type}, {"has_ac", has_ac}, {"price", price}, 
                    {"image_url", image_url}, {"facilities", facilities}, {"is_available", is_available}};
    }
};

struct Service {
    int id;
    std::string name;
    std::string description;
    std::string image_url;
    double price;
    
    json to_json() const {
        return json{{"id", id}, {"name", name}, {"description", description}, {"image_url", image_url}, {"price", price}};
    }
};

struct Booking {
    int id;
    int user_id;
    int room_id;
    std::string check_in; // YYYY-MM-DD
    std::string check_out;
    int guests;
    double total_price;
    std::string food_package; // "None", "Veg", "Non-Veg", "Buffet"
    std::string services_booked; // JSON array string of service IDs
    std::string status; // "Confirmed", "Cancelled"
    
    // For joining data when sending to UI
    std::string customer_name;
    std::string room_type;
    std::string created_at;

    json to_json() const {
        return json{
            {"id", id}, {"user_id", user_id}, {"room_id", room_id}, 
            {"check_in", check_in}, {"check_out", check_out}, 
            {"guests", guests}, {"total_price", total_price}, 
            {"food_package", food_package},
            {"services_booked", services_booked}, {"status", status},
            {"customer_name", customer_name}, {"room_type", room_type},
            {"created_at", created_at}
        };
    }
};
