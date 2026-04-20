#include "httplib.h"
#include "database.hpp"
#include "json.hpp"
#include <iostream>

using json = nlohmann::json;

void set_cors(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

int main() {
    Database db("hotel.db");
    db.init_tables();
    db.seed_data();

    httplib::Server svr;

    // Handle CORS preflight
    svr.Options(R"(.*)", [](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        res.status = 200;
    });

    // Static files - serve the frontend
    svr.set_mount_point("/", "./public");

    // ----- USER ENDPOINTS -----
    svr.Post("/api/register", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        try {
            auto body = json::parse(req.body);
            User u;
            u.name = body["name"];
            u.email = body["email"];
            u.phone = body.value("phone", "");
            u.password = body["password"]; // In prod, hash this.
            u.role = "user";

            if (db.register_user(u)) {
                res.set_content(json{{"status", "success"}}.dump(), "application/json");
            } else {
                res.status = 400;
                res.set_content(json{{"error", "Email already exists"}}.dump(), "application/json");
            }
        } catch (std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    svr.Post("/api/login", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        try {
            auto body = json::parse(req.body);
            std::string email = body["email"];
            std::string password = body["password"];

            auto u = db.authenticate(email, password);
            if (u) {
                res.set_content(json{{"status", "success"}, {"user", u->to_json()}}.dump(), "application/json");
            } else {
                res.status = 401;
                res.set_content(json{{"error", "Invalid credentials"}}.dump(), "application/json");
            }
        } catch (std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    });

    // ----- ROOM ENDPOINTS -----
    svr.Get("/api/rooms", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        auto rooms = db.get_all_rooms();
        json result = json::array();
        for (const auto& r : rooms) result.push_back(r.to_json());
        res.set_content(result.dump(), "application/json");
    });

    svr.Post("/api/rooms", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        try {
            auto body = json::parse(req.body);
            Room r;
            r.type = body.value("type", "Single");
            r.has_ac = body.value("has_ac", false);
            r.price = body.value("price", 1000.0);
            r.image_url = body.value("image_url", "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80");
            r.facilities = body.value("facilities", "");
            r.is_available = body.value("is_available", true);
            
            if (db.add_room(r)) {
                res.set_content(json{{"status", "success"}}.dump(), "application/json");
            } else {
                res.status = 500;
                res.set_content(json{{"error", "Failed to add room"}}.dump(), "application/json");
            }
        } catch (...) {
            res.status = 400;
            res.set_content(json{{"error", "Invalid data"}}.dump(), "application/json");
        }
    });

    svr.Delete(R"(/api/rooms/(\d+))", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        int id = std::stoi(req.matches[1]);
        if (db.delete_room(id)) {
            res.set_content(json{{"status", "success"}}.dump(), "application/json");
        } else {
            res.status = 500;
        }
    });

    // ----- SERVICES ENDPOINTS -----
    svr.Get("/api/services", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        auto services = db.get_all_services();
        json result = json::array();
        for (const auto& s : services) result.push_back(s.to_json());
        res.set_content(result.dump(), "application/json");
    });

    // ----- BOOKING ENDPOINTS -----
    svr.Post("/api/bookings", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        try {
            auto body = json::parse(req.body);
            std::string room_type = body["room_type"];
            bool has_ac = body["has_ac"];
            std::string check_in = body["check_in"];
            std::string check_out = body["check_out"];

            auto room = db.get_available_room(room_type, has_ac, check_in, check_out);
            if (!room) {
                res.status = 400;
                res.set_content(json{{"error", "No rooms strictly available for these dates and AC preference."}}.dump(), "application/json");
                return;
            }

            Booking b;
            b.user_id = body["user_id"];
            b.room_id = room->id;
            b.check_in = check_in;
            b.check_out = check_out;
            b.guests = body["guests"];
            b.total_price = body["total_price"];
            b.food_package = body.value("food_package", "None");
            b.services_booked = body["services_booked"].dump(); 
            b.status = "Confirmed";

            if (db.create_booking(b)) {
                res.set_content(json{{"status", "success", "room_id", room->id}}.dump(), "application/json");
            } else {
                res.status = 500;
                res.set_content(json{{"error", "Failed to finalize insertion."}}.dump(), "application/json");
            }
        } catch (std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", "Invalid format"}}.dump(), "application/json");
        }
    });

    svr.Get(R"(/api/bookings/user/(\d+))", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        int user_id = std::stoi(req.matches[1]);
        auto bookings = db.get_bookings_by_user(user_id);
        json result = json::array();
        for (const auto& b : bookings) result.push_back(b.to_json());
        res.set_content(result.dump(), "application/json");
    });

    svr.Get("/api/bookings", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        auto bookings = db.get_all_bookings();
        json result = json::array();
        for (const auto& b : bookings) result.push_back(b.to_json());
        res.set_content(result.dump(), "application/json");
    });

    svr.Put(R"(/api/bookings/(\d+)/status)", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        int id = std::stoi(req.matches[1]);
        try {
            auto body = json::parse(req.body);
            std::string status = body["status"];
            if (db.update_booking_status(id, status)) {
                res.set_content(json{{"status", "success"}}.dump(), "application/json");
            } else {
                res.status = 500;
            }
        } catch (...) {
            res.status = 400;
        }
    });

    // ----- DASHBOARD ENDPOINT -----
    svr.Get("/api/stats", [&db](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        json stats = db.get_dashboard_stats();
        res.set_content(stats.dump(), "application/json");
    });

    std::cout << "Server starting on http://localhost:8085..." << std::endl;
    svr.listen("0.0.0.0", 8085);
    return 0;
}
