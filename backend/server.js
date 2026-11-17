
const express = require("express");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Blynk
const BLYNK_URL =
    process.env.BLYNK_BASE_URL || "https://blynk.cloud/external/api";

const BLYNK_TOKEN = process.env.BLYNK_AUTH_TOKEN;

// ========================================
// MIDDLEWARE
// ========================================

app.use(express.json());

// Menghubungkan frontend
app.use(express.static(path.join(__dirname, "public")));

// Menampilkan halaman utama
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ========================================
// FUNGSI BLYNK
// ========================================

// Mengambil data dari Blynk
async function getBlynkValue(pin) {
    const response = await axios.get(`${BLYNK_URL}/get`, {
        params: {
            token: BLYNK_TOKEN,
            [pin]: ""
        },
        timeout: 10000
    });

    const result = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

    return Number(result);
}

// Mengirim data ke Blynk
async function updateBlynkValue(pin, value) {
    await axios.get(`${BLYNK_URL}/update`, {
        params: {
            token: BLYNK_TOKEN,
            [pin]: value
        },
        timeout: 10000
    });
}

// ========================================
// API HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "OK",
        message: "Smart Egg Incubator Backend aktif"
    });
});

// ========================================
// API MONITORING
// ========================================

app.get("/api/monitoring", async (req, res) => {
    try {
        if (!BLYNK_TOKEN) {
            throw new Error("Token Blynk belum dikonfigurasi");
        }

        const [
            temperature,
            humidity,
            heater,
            fuzzy,
            setpoint
        ] = await Promise.all([
            getBlynkValue("V0"),
            getBlynkValue("V1"),
            getBlynkValue("V2"),
            getBlynkValue("V3"),
            getBlynkValue("V4")
        ]);

        const values = {
            temperature,
            humidity,
            heater,
            fuzzy,
            setpoint
        };

        // Memastikan semua data valid
        for (const [key, value] of Object.entries(values)) {
            if (!Number.isFinite(value)) {
                throw new Error(`Data ${key} tidak valid`);
            }
        }

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...values
        });

    } catch (error) {
        console.error("Monitoring error:", error.message);

        res.status(502).json({
            success: false,
            message: "Tidak dapat mengambil data dari Blynk"
        });
    }
});

// ========================================
// API SETPOINT
// ========================================

app.post("/api/setpoint", async (req, res) => {
    try {
        if (!BLYNK_TOKEN) {
            throw new Error("Token Blynk belum dikonfigurasi");
        }

        const value = Number(req.body.setpoint);

        if (
            !Number.isFinite(value) ||
            value < 37 ||
            value > 38
        ) {
            return res.status(400).json({
                success: false,
                message: "Setpoint harus antara 37 sampai 38°C"
            });
        }

        await updateBlynkValue("V4", value);

        res.json({
            success: true,
            message: "Setpoint berhasil dikirim ke Blynk",
            setpoint: value
        });

    } catch (error) {
        console.error("Setpoint error:", error.message);

        res.status(502).json({
            success: false,
            message: "Gagal mengirim setpoint ke Blynk"
        });
    }
});

// ========================================
// MENJALANKAN SERVER
// ========================================

if (require.main === module) {
    app.listen(PORT, () => {
        console.log("-----------------------------------");
        console.log("       SMART EGG INCUBATOR");
        console.log("-----------------------------------");
        console.log(`Server berjalan di http://localhost:${PORT}`);
        console.log("-----------------------------------");
    });
}

// Export untuk deployment
module.exports = app;
