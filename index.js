let liveDatabaseState = [];
        let selectedIndex = 0;

        async function fetchStateFromScraper() {
            try {
                const response = await fetch('./trends_social_intelligence.json');
                if(!response.ok) throw new Error('Data stream file missing');
                liveDatabaseState = await response.json();
                
                renderWatchlist(liveDatabaseState);
                renderFlowsAlerts(liveDatabaseState);
                updateFocusTerminal(selectedIndex);
            } catch (err) {
                document.getElementById('status-badge').className = "bg-rose-950/20 border border-rose-900 text-rose-400 text-xs px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5";
                document.getElementById('status-badge').innerHTML = "⚠️ Data Feed Unavailable";
            }
        }

        function renderWatchlist(data) {
            const tbody = document.getElementById('watchlist-body');
            tbody.innerHTML = data.map((item, index) => {
                const isSelected = selectedIndex === index;
                const isBullish = item.metrics.signal === "BULLISH";
                
                const signalBadge = isBullish 
                    ? `<span class="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold font-mono">BULLISH</span>`
                    : `<span class="bg-gray-800 text-gray-400 text-[10px] px-2 py-0.5 rounded-md font-bold font-mono">BEARISH</span>`;

                return `
                    <tr onclick="updateFocusTerminal(${index})" class="hover:bg-gray-900/40 transition-all cursor-pointer ${isSelected ? 'bg-yellow-500/[0.02] border-l-2 border-yellow-500' : ''}">
                        <td class="p-4 font-bold text-white tracking-wide">${item.ticker}<span class="text-xs block text-gray-500 font-normal font-sans">${item.companyName}</span></td>
                        <td class="p-4 font-mono text-gray-300 font-semibold">$${item.priceMock.toLocaleString()}</td>
                        <td class="p-4">${signalBadge}</td>
                        <td class="p-4 text-right">
                            <button class="text-xs font-semibold text-gray-400 hover:text-yellow-400 transition-colors bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-800">Inspect</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function renderFlowsAlerts(data) {
            const container = document.getElementById('flows-container');
            const flowsItems = data.filter(item => item.metrics.unusualFlow.detected);

            if(flowsItems.length === 0) {
                container.innerHTML = `<p class="text-xs text-gray-600 italic">No block trades identified.</p>`;
                return;
            }

            container.innerHTML = flowsItems.map(item => `
                <div class="bg-gray-900/20 border border-gray-900 p-4 rounded-xl flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg text-yellow-400 text-xs font-mono font-bold">
                            ${item.metrics.unusualFlow.optionType}
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-white font-mono">Large Vol Volume Anomaly on ${item.ticker}</h4>
                            <p class="text-[10px] text-gray-500 font-sans">Filtered from trending conversational blocks.</p>
                        </div>
                    </div>
                    <span class="text-xs font-mono font-bold text-yellow-500">+$${item.metrics.unusualFlow.sweepVolumeUSD.toLocaleString()}</span>
                </div>
            `).join('');
        }

        function updateFocusTerminal(index) {
            selectedIndex = index;
            const asset = liveDatabaseState[index];
            if(!asset) return;

            document.getElementById('focus-ticker').innerText = asset.ticker;
            document.getElementById('focus-name').innerText = `${asset.companyName} data metrics layout.`;
            
            document.getElementById('stat-bullish').innerText = `${asset.metrics.bullish}%`;
            document.getElementById('bar-bullish').style.width = `${asset.metrics.bullish}%`;
            
            document.getElementById('stat-bearish').innerText = `${asset.metrics.bearish}%`;
            document.getElementById('bar-bearish').style.width = `${asset.metrics.bearish}%`;

            document.getElementById('raw-log-block').textContent = asset.rawConversationSnippet;
            
            renderWatchlist(liveDatabaseState);
        }

        fetchStateFromScraper();
        lucide.createIcons();
