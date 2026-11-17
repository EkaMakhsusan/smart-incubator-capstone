
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const BLYNK_URL = process.env.BLYNK_BASE_URL;
const BLYNK_TOKEN = process.env.BLYNK_AUTH_TOKEN;

// Middleware
app.use(express.json());

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

// Mengecek backend
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Smart Egg Incubator Backend aktif"
    });
});

// Mengambil data monitoring
app.get("/api/monitoring", async (req, res) => {
    try {
        if (!BLYNK_TOKEN || !BLYNK_URL) {
            throw new Error("Konfigurasi Blynk belum tersedia");
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

// Mengubah setpoint melalui Blynk V4
app.post("/api/setpoint", async (req, res) => {
    try {
        if (!BLYNK_TOKEN || !BLYNK_URL) {
            throw new Error("Konfigurasi Blynk belum tersedia");
        }

        const value = Number(req.body.setpoint);

        if (!Number.isFinite(value) || value < 37 || value > 38) {
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

// Menjalankan server lokal
// Vercel mendukung pola app.listen() untuk Express.
app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log(" SMART EGG INCUBATOR");
    console.log("-----------------------------------");
    console.log(`Server berjalan pada port ${PORT}`);
    console.log("-----------------------------------");
});
