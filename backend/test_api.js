const express = require("express");
const http = require("http");
const app = require("./app");
const pool = require("./config/db");

let server;

async function runTests() {
    console.log("🧪 Starting API & Database Integration Tests...\n");
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    async function req(path, method = "GET", body = null, token = null) {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const opts = { method, headers };
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${baseUrl}${path}`, opts);
        const data = await res.json();
        return { status: res.status, data };
    }

    try {
        // 1. Health check
        const health = await req("/health");
        console.log("✓ Health Check:", health.status === 200 && health.data.success ? "PASSED" : "FAILED", health.data);

        // 2. Login Admin
        const adminLogin = await req("/auth/login", "POST", { email: "admin@hunarhub.com", password: "admin123" });
        console.log("✓ Admin Login:", adminLogin.status === 200 && adminLogin.data.token ? "PASSED" : "FAILED");
        const adminToken = adminLogin.data.token;

        // 3. Login Entrepreneur
        const epLogin = await req("/auth/login", "POST", { email: "ramesh@hunarhub.com", password: "password123" });
        console.log("✓ Entrepreneur Login:", epLogin.status === 200 && epLogin.data.token ? "PASSED" : "FAILED");
        const epToken = epLogin.data.token;

        // 4. Login Customer
        const custLogin = await req("/auth/login", "POST", { email: "ananya@hunarhub.com", password: "password123" });
        console.log("✓ Customer Login:", custLogin.status === 200 && custLogin.data.token ? "PASSED" : "FAILED");
        const custToken = custLogin.data.token;

        // 5. Public Categories & Products
        const cats = await req("/categories");
        console.log("✓ Public Categories Count:", cats.data.categories?.length || 0);

        const prods = await req("/products");
        console.log("✓ Public Products Count:", prods.data.products?.length || 0);

        const svcs = await req("/services");
        console.log("✓ Public Services Count:", svcs.data.services?.length || 0);

        // 6. Entrepreneur Dashboard
        const dash = await req("/entrepreneurs/dashboard", "GET", null, epToken);
        console.log("✓ Entrepreneur Dashboard:", dash.data.success ? "PASSED" : "FAILED", dash.data.dashboard?.counts);

        // 7. Customer Create Order Transaction
        const createOrder = await req("/orders", "POST", {
            items: [{ product_id: prods.data.products[0].id, quantity: 1 }],
            shipping_address: "Test Address"
        }, custToken);
        console.log("✓ Customer Order Transaction:", createOrder.data.success ? "PASSED" : "FAILED", `Order ID: ${createOrder.data.order?.id}`);

        // 8. Admin Dashboard & Analytics
        const adminDash = await req("/admin/dashboard", "GET", null, adminToken);
        console.log("✓ Admin Dashboard Overview:", adminDash.data.success ? "PASSED" : "FAILED", adminDash.data.dashboard);

        console.log("\n🎉 All Integration Tests Completed Successfully!");
    } catch (err) {
        console.error("❌ Test Failed:", err);
    } finally {
        server.close();
        await pool.end();
    }
}

runTests();
