
// ========================================
// 1. MENGAMBIL ELEMEN HTML
// ========================================

const temperatureElement = document.getElementById("temperature");
const humidityElement = document.getElementById("humidity");
const heaterElement = document.getElementById("heater");
const fuzzyElement = document.getElementById("fuzzy");
const dashboardSetpoint = document.getElementById("dashboard-setpoint");

const connectionElement = document.getElementById("connection-status");
const statusDot = document.getElementById("status-dot");

const setpointInput = document.getElementById("setpoint-input");
const saveButton = document.getElementById("save-setpoint");
const setpointMessage = document.getElementById("setpoint-message");

const lastUpdateElement = document.getElementById("last-update");

const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");


// ========================================
// 2. NAVIGASI HALAMAN
// ========================================

const navigationLinks = document.querySelectorAll(".nav-link");

const pages = document.querySelectorAll(".page-section");

const pageInformation = {
    dashboard: {
        title: "Dashboard",
        description: "Ringkasan kondisi inkubator telur"
    },

    monitoring: {
        title: "Monitoring",
        description: "Pemantauan sensor secara real-time"
    },

    settings: {
        title: "Pengaturan",
        description: "Pengaturan parameter inkubator"
    }
};

function showPage(pageName) {

    // Menyembunyikan seluruh halaman
    pages.forEach(page => {
        page.classList.remove("active");
    });

    // Menghilangkan status aktif semua menu
    navigationLinks.forEach(link => {
        link.classList.remove("active");
    });

    // Menampilkan halaman yang dipilih
    const selectedPage = document.getElementById(
        `page-${pageName}`
    );

    if (!selectedPage) return;

    selectedPage.classList.add("active");

    // Mengaktifkan menu
    const selectedLink = document.querySelector(
        `[data-page="${pageName}"]`
    );

    if (selectedLink) {
        selectedLink.classList.add("active");
    }

    // Mengubah judul halaman
    pageTitle.textContent = pageInformation[pageName].title;

    pageDescription.textContent =
        pageInformation[pageName].description;

    // Memperbaiki ukuran grafik ketika halaman monitoring dibuka
    if (pageName === "monitoring") {
        setTimeout(() => {
            temperatureChart.resize();
            humidityChart.resize();
        }, 100);
    }

    // Mengubah alamat hash
    window.location.hash = pageName;
}


// Event klik menu
navigationLinks.forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        const pageName = link.dataset.page;

        showPage(pageName);

    });

});


// Membuka halaman berdasarkan alamat hash
const initialPage = window.location.hash.replace("#", "");

if (pageInformation[initialPage]) {
    showPage(initialPage);
} else {
    showPage("dashboard");
}


// ========================================
// 3. PENGATURAN GRAFIK
// ========================================

const MAX_DATA = 20;

const temperatureChart = new Chart(
    document.getElementById("temperatureChart"),
    {
        type: "line",

        data: {
            labels: [],

            datasets: [{
                label: "Suhu (°C)",
                data: [],
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.10)",
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            scales: {
                y: {
                    min: 30,
                    max: 45
                }
            }
        }
    }
);


const humidityChart = new Chart(
    document.getElementById("humidityChart"),
    {
        type: "line",

        data: {
            labels: [],

            datasets: [{
                label: "Kelembapan (%)",
                data: [],
                borderColor: "#0891b2",
                backgroundColor: "rgba(8, 145, 178, 0.10)",
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: true,

            scales: {
                y: {
                    min: 0,
                    max: 100
                }
            }
        }
    }
);


// ========================================
// 4. MEMPERBARUI GRAFIK
// ========================================

function updateChart(chart, value) {

    const time = new Date().toLocaleTimeString("id-ID");

    chart.data.labels.push(time);

    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > MAX_DATA) {

        chart.data.labels.shift();

        chart.data.datasets[0].data.shift();

    }

    chart.update("none");

}


// ========================================
// 5. STATUS KONEKSI
// ========================================

function setConnectionStatus(connected) {

    if (connected) {

        connectionElement.textContent = "Blynk API terhubung";

        statusDot.style.background = "#16a34a";

    } else {

        connectionElement.textContent = "Blynk API tidak terhubung";

        statusDot.style.background = "#dc2626";

    }

}


// ========================================
// 6. MENGAMBIL DATA DARI BACKEND
// ========================================

async function getMonitoringData() {

    try {

        const response = await fetch("/api/monitoring", {
            cache: "no-store"
        });

        if (!response.ok) {

            throw new Error("Gagal mengambil data Blynk");

        }

        const data = await response.json();

        const values = [
            data.temperature,
            data.humidity,
            data.heater,
            data.fuzzy,
            data.setpoint
        ];

        if (!values.every(Number.isFinite)) {

            throw new Error("Data sensor tidak valid");

        }

        if (
            data.temperature < -40 ||
            data.temperature > 80 ||
            data.humidity < 0 ||
            data.humidity > 100 ||
            ![0, 1].includes(data.heater) ||
            data.fuzzy < 0 ||
            data.fuzzy > 100 ||
            data.setpoint < 37 ||
            data.setpoint > 38
        ) {

            throw new Error("Data sensor di luar batas yang diharapkan");

        }

        // Menampilkan suhu
        temperatureElement.textContent =
            data.temperature.toFixed(1);

        // Menampilkan kelembapan
        humidityElement.textContent =
            data.humidity.toFixed(1);

        // Menampilkan status heater
        heaterElement.textContent =
            data.heater === 1 ? "ON" : "OFF";

        // Menampilkan fuzzy
        fuzzyElement.textContent =
            data.fuzzy.toFixed(1);

        // Menampilkan setpoint
        dashboardSetpoint.textContent =
            data.setpoint.toFixed(1);

        // Mengisi input setpoint
        if (document.activeElement !== setpointInput) {

            setpointInput.value = data.setpoint.toFixed(1);

        }

        // Memperbarui grafik
        updateChart(temperatureChart, data.temperature);

        updateChart(humidityChart, data.humidity);

        // Waktu pembaruan
        lastUpdateElement.textContent =
            "Pembaruan terakhir: " +
            new Date(data.timestamp).toLocaleString("id-ID");

        setConnectionStatus(true);

    } catch (error) {

        console.error("Monitoring error:", error);

        setConnectionStatus(false);

    }

}


// ========================================
// 7. MENGUBAH SETPOINT
// ========================================

async function updateSetpoint() {

    const value = Number(setpointInput.value);

    if (!Number.isFinite(value) || value < 37 || value > 38) {

        setpointMessage.textContent =
            "Setpoint harus antara 37 sampai 38°C";

        setpointMessage.style.color = "#dc2626";

        return;

    }

    try {

        saveButton.disabled = true;

        setpointMessage.textContent =
            "Mengirim setpoint ke Blynk...";

        setpointMessage.style.color = "#64748b";

        const response = await fetch("/api/setpoint", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                setpoint: value
            })

        });

        const result = await response.json();

        if (!response.ok) {

            throw new Error(
                result.message || "Gagal mengirim setpoint"
            );

        }

        setpointMessage.textContent =
            "Setpoint berhasil dikirim: " +
            result.setpoint + "°C";

        setpointMessage.style.color = "#16a34a";

        dashboardSetpoint.textContent = value.toFixed(1);

        await getMonitoringData();

    } catch (error) {

        console.error("Setpoint error:", error);

        setpointMessage.textContent =
            error.message || "Gagal mengubah setpoint";

        setpointMessage.style.color = "#dc2626";

    } finally {

        saveButton.disabled = false;

    }

}


// Event tombol simpan
saveButton.addEventListener("click", updateSetpoint);


// ========================================
// 8. MENJALANKAN MONITORING
// ========================================

// Mengambil data pertama kali
getMonitoringData();

// Memperbarui setiap 5 detik
setInterval(getMonitoringData, 5000);
