let liveDatabaseState = [];
        let selectedIndex = 0;
        let chartInstance = null;

        const eventSource = new EventSource('/api/stream');
        const logBox = document.getElementById('terminal-logs');

        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.message === "COMPLETE") {
                document.getElementById('start-screen').classList.add('hidden');
                document.getElementById('dashboard-content').classList.remove('opacity-10', 'pointer-events-none', 'filter', 'blur-sm');
                return;
            }
            const logEntry = document.createElement('div');
            logEntry.className = data.message.startsWith('SUCCESS') ? "text-emerald-400" : "text-gray-400";
            logEntry.innerHTML = `<span class="text-yellow-500/50">&gt;</span> ${data.message}`;
            logBox.appendChild(logEntry);
            logBox.scrollTop = logBox.scrollHeight;
        };

        async function initializePipeline() {
            const t1 = document.getElementById('ticker-1').value.trim().toUpperCase();
            const t2 = document.getElementById('ticker-2').value.trim().toUpperCase();
            const t3 = document.getElementById('ticker-3').value.trim().toUpperCase();
            let tickers = [t1, t2, t3].filter(t => t.length > 0).map(t => t.startsWith('$') ? t : '$' + t);

            document.getElementById('config-card').classList.add('hidden');
            document.getElementById('loader-card').classList.remove('hidden');

            try {
                const response = await fetch('/api/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tickers: tickers })
                });
                const result = await response.json();
                
                liveDatabaseState = result.data;
                renderWatchlist(liveDatabaseState);
                renderFlowsAlerts(liveDatabaseState);
                updateFocusTerminal(0);
            } catch (err) { alert("Execution error."); location.reload(); }
        }

        function renderWatchlist(data) {
            const tbody = document.getElementById('watchlist-body');
            tbody.innerHTML = data.map((item, index) => `
                <tr onclick="updateFocusTerminal(${index})" class="hover:bg-gray-900/40 transition-all cursor-pointer ${selectedIndex === index ? 'bg-yellow-500/[0.02] border-l-2 border-yellow-500' : ''}">
                    <td class="p-4 font-bold text-white">${item.ticker}<span class="text-xs block text-gray-500 font-normal font-sans">${item.companyName}</span></td>
                    <td class="p-4 font-mono text-gray-300 font-semibold">$${item.priceMock.toLocaleString()}</td>
                    <td class="p-4"><span class="${item.metrics.signal === "BULLISH" ? 'bg-yellow-500/10 text-yellow-400' : 'bg-gray-800 text-gray-400'} text-[10px] px-2 py-0.5 rounded-md font-bold font-mono">${item.metrics.signal}</span></td>
                    <td class="p-4 text-right"><button class="text-xs font-semibold text-gray-400 hover:text-yellow-400 transition-colors bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-800">Inspect</button></td>
                </tr>
            `).join('');
        }

        function renderFlowsAlerts(data) {
            const container = document.getElementById('flows-container');
            const flowsItems = data.filter(item => item.metrics.unusualFlow.detected);
            if(flowsItems.length === 0) { container.innerHTML = `<p class="text-xs text-gray-600 italic">No option sweeps.</p>`; return; }
            container.innerHTML = flowsItems.map(item => `
                <div class="bg-gray-900/20 border border-gray-900 p-4 rounded-xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 p-2 rounded-lg text-xs font-bold">${item.metrics.unusualFlow.optionType}</div>
                        <div><h4 class="text-xs font-bold text-white font-mono">Option Sweep on ${item.ticker}</h4></div>
                    </div>
                    <span class="text-xs font-mono font-bold text-yellow-500">+$${item.metrics.unusualFlow.sweepVolumeUSD.toLocaleString()}</span>
                </div>
            `).join('');
        }

        // 📉 RENDER CHART INSTANCE IN PURE BLACK AND AMBER-YELLOW
        function renderPredictionChart(chartData) {
            const ctx = document.getElementById('predictionChart').getContext('2d');
            
            if (chartInstance) { chartInstance.destroy(); }

            const labels = ['D-5', 'D-3', 'D-1', 'Today', 'T+1', 'T+3', 'T+5', 'T+7'];
            
            // Merging arrays to form a single continuous display line
            const historicalPoints = [...chartData.historical];
            const fullLineData = [...historicalPoints];
            
            chartData.projected.forEach(val => fullLineData.push(val));

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Historical Trend',
                            data: [...historicalPoints, ...Array(7).fill(null)],
                            borderColor: '#4b5563', // Soft slate gray
                            borderWidth: 2,
                            pointRadius: 1,
                            fill: false,
                            tension: 0.2
                        },
                        {
                            label: 'AI Forecast (7-Day Horizon)',
                            data: [...Array(historicalPoints.length - 1).fill(null), historicalPoints[historicalPoints.length - 1], ...chartData.projected],
                            borderColor: '#facc15', // Neon yellow accent
                            borderWidth: 2,
                            borderDash: [5, 5], // Elegant dotted layout indicator
                            pointBackgroundColor: '#facc15',
                            pointRadius: 3,
                            fill: false,
                            tension: 0.2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } } },
                        y: { grid: { color: '#1f2937' }, ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } } }
                    }
                }
            });
        }

        function updateFocusTerminal(index) {
            selectedIndex = index;
            const asset = liveDatabaseState[index];
            if(!asset) return;

            document.getElementById('focus-ticker').innerText = asset.ticker;
            document.getElementById('focus-name').innerText = `${asset.companyName} timeline evaluation module.`;
            document.getElementById('stat-bullish').innerText = `${asset.metrics.bullish}%`;
            document.getElementById('bar-bullish').style.width = `${asset.metrics.bullish}%`;
            document.getElementById('stat-bearish').innerText = `${asset.metrics.bearish}%`;
            document.getElementById('bar-bearish').style.width = `${asset.metrics.bearish}%`;
            document.getElementById('raw-log-block').textContent = asset.rawConversationSnippet;
            
            // Re-render the visual graph line metrics
            renderPredictionChart(asset.chartTimeline);
            renderWatchlist(liveDatabaseState);
        }

        lucide.createIcons();
