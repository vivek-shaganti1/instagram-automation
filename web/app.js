document.addEventListener("DOMContentLoaded", () => {
    let chart = null;

    // Load initial stats
    fetchStats();

    // Event listeners
    document.getElementById("btn-post-now").addEventListener("click", triggerPostNow);
    document.getElementById("btn-sync-stats").addEventListener("click", triggerSyncStats);

    function showToast(message, type = "success") {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.style.borderColor = type === "error" ? "#ef4444" : "#8b5cf6";
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

    async function fetchStats() {
        try {
            const response = await fetch("/api/stats");
            if (!response.ok) throw new Error("API error");
            const data = await response.json();
            updateUI(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
            showToast("Failed to load dashboard statistics", "error");
        }
    }

    function updateUI(data) {
        const posts = data.posts || [];
        const dailyStats = data.daily_stats || {};
        const settings = data.settings || {};

        // Calculate aggregates
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        document.getElementById("val-views").textContent = totalViews.toLocaleString();

        // Update target cards
        const target = trackerCalculateCurrentTarget();
        document.getElementById("val-target").textContent = target.toLocaleString();

        // Update Strategy Status
        const strategyVal = document.getElementById("val-strategy");
        const strategyDesc = document.getElementById("val-strategy-desc");
        if (settings.aggressive_hooks) {
            strategyVal.textContent = "Aggressive Hook";
            strategyVal.style.color = "var(--accent-amber)";
            strategyDesc.textContent = "Low views trigger active";
        } else {
            strategyVal.textContent = "Optimized Mode";
            strategyVal.style.color = "var(--accent-cyan)";
            strategyDesc.textContent = "Hitting views goal";
        }

        // Render Posts Grid
        const container = document.getElementById("posts-container");
        container.innerHTML = "";
        
        if (posts.length === 0) {
            container.innerHTML = `<div class="loading-spinner">No posts uploaded yet. Trigger a run or wait for scheduler.</div>`;
        } else {
            posts.forEach(post => {
                const dateObj = new Date(post.taken_at);
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                // Categorize based on caption matching
                let category = "AI News";
                let capLower = post.caption.toLowerCase();
                if (capLower.includes("hustle") || capLower.includes("money") || capLower.includes("startup")) {
                    category = "Business & Earnings";
                } else if (capLower.includes("mindset") || capLower.includes("motivation") || capLower.includes("discipline")) {
                    category = "Motivation";
                }

                const postCard = document.createElement("div");
                postCard.className = "card glass-card post-card";
                
                // Fallback background color if thumbnail is empty
                const bgStyle = post.thumbnail ? `background-image: url('${post.thumbnail}')` : `background: linear-gradient(135deg, #1e1b4b, #0c0a09)`;

                postCard.innerHTML = `
                    <div class="post-thumbnail" style="${bgStyle}">
                        <span class="post-meta-tag">${category}</span>
                    </div>
                    <div class="post-info">
                        <div class="post-date">${dateStr}</div>
                        <div class="post-caption">${post.caption}</div>
                        <div class="post-stats-row">
                            <div class="stat-item">
                                <span>Views:</span> <strong>${(post.views || 0).toLocaleString()}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Likes:</span> <strong>${(post.likes || 0).toLocaleString()}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Comments:</span> <strong>${(post.comments || 0).toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(postCard);
            });
        }

        // Draw Chart.js Graph
        drawChart(dailyStats);
    }

    function trackerCalculateCurrentTarget() {
        const startDate = new Date("2026-05-28");
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
        const days = diffDays < 0 ? 0 : diffDays;
        return Math.floor(100 * Math.pow(1 + 0.15, days));
    }

    function drawChart(dailyStats) {
        const ctx = document.getElementById("growthChart").getContext("2d");
        
        // Sort dates chronologically
        const sortedDates = Object.keys(dailyStats).sort();
        
        // If empty, generate standard mock progression based on actual dates
        const dates = sortedDates.length > 0 ? sortedDates : generateMockDates();
        const targets = dates.map((d, index) => Math.floor(100 * Math.pow(1 + 0.15, index)));
        const actuals = dates.map(d => dailyStats[d] ? dailyStats[d].total_views : 0);

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates.map(d => formatDateLabel(d)),
                datasets: [
                    {
                        label: 'Target (Exponential)',
                        data: targets,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        tension: 0.3
                    },
                    {
                        label: 'Actual Views',
                        data: actuals,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.05)',
                        fill: true,
                        borderWidth: 3,
                        pointBackgroundColor: '#06b6d4',
                        pointRadius: 4,
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.03)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.03)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    function generateMockDates() {
        const mock = [];
        const d = new Date("2026-05-28");
        for (let i = 0; i < 7; i++) {
            mock.push(d.toISOString().split("T")[0]);
            d.setDate(d.getDate() + 1);
        }
        return mock;
    }

    function formatDateLabel(dateStr) {
        const parts = dateStr.split("-");
        if (parts.length < 3) return dateStr;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[parseInt(parts[1]) - 1]} ${parts[2]}`;
    }

    async function triggerPostNow() {
        const btn = document.getElementById("btn-post-now");
        btn.disabled = true;
        btn.textContent = "Posting Reel...";
        showToast("AI generation and upload started...");

        try {
            const response = await fetch("/api/post-now", { method: "POST" });
            const result = await response.json();
            if (response.ok && result.success) {
                showToast("Reel posted successfully! Refreshing dashboard...");
                fetchStats();
            } else {
                throw new Error(result.error || "Post request failed");
            }
        } catch (error) {
            console.error("Error triggering post:", error);
            showToast("Failed to post Reel: " + error.message, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = "Post Reel Now";
        }
    }

    async function triggerSyncStats() {
        const btn = document.getElementById("btn-sync-stats");
        btn.disabled = true;
        showToast("Synchronizing with Instagram Insights...");

        try {
            const response = await fetch("/api/sync-stats", { method: "POST" });
            if (response.ok) {
                showToast("Instagram metrics sync completed!");
                fetchStats();
            } else {
                throw new Error("Sync request failed");
            }
        } catch (error) {
            console.error("Error syncing stats:", error);
            showToast("Failed to sync metrics from Instagram", "error");
        } finally {
            btn.disabled = false;
        }
    }
});
