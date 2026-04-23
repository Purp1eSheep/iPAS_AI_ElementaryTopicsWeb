import { State } from './state.js';
import { Storage } from './storage.js';

export const UIDashboard = {
    renderDashboard: () => {
        const stats = Storage.get(Storage.KEYS.STATS, {});
        const unitFilter = document.getElementById('dashboard-unit-filter');
        const dashboardContent = document.getElementById('dashboard-content');
        const noDataMsg = document.getElementById('no-data-msg');
        
        if (unitFilter.options.length <= 1) {
            const topics = [...new Set(State.globalQuestions.map(q => q.topic))].sort();
            unitFilter.innerHTML = '<option value="">所有單元</option>' + topics.map(t => `<option value="${t}">${t}</option>`).join('');
        }
        
        const targetUnit = unitFilter.value;
        const attemptedIds = Object.keys(stats).filter(id => {
            if (!targetUnit) return true;
            const q = State.globalQuestions.find(i => i.id === id);
            return q && q.topic === targetUnit;
        });

        if (Object.keys(stats).length === 0) {
            dashboardContent.classList.add('hidden');
            noDataMsg.classList.remove('hidden');
            return;
        }
        dashboardContent.classList.remove('hidden');
        noDataMsg.classList.add('hidden');

        let filteredAttempts = 0, filteredWrongs = 0;
        attemptedIds.forEach(id => { filteredAttempts += stats[id].t; filteredWrongs += stats[id].w; });
        
        const totalInUnit = targetUnit 
            ? State.globalQuestions.filter(q => q.topic === targetUnit).length
            : State.globalQuestions.length;

        document.getElementById('overall-accuracy').textContent = `${filteredAttempts > 0 ? Math.round(((filteredAttempts - filteredWrongs) / filteredAttempts) * 100) : 0}%`;
        document.getElementById('overall-progress').textContent = `${Math.round((attemptedIds.length / totalInUnit) * 100)}%`;

        if (State.charts.progress) State.charts.progress.destroy();
        State.charts.progress = new Chart(document.getElementById('progressChart'), {
            type: 'doughnut',
            data: { labels: ['已挑戰', '未挑戰'], datasets: [{ data: [attemptedIds.length, totalInUnit - attemptedIds.length], backgroundColor: ['#7c6dfa', '#23263a'], borderWidth: 0 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#7a7e9a' } } } }
        });

        const unitStats = {};
        const topics = targetUnit ? [targetUnit] : [...new Set(State.globalQuestions.map(q => q.topic))].sort();
        
        topics.forEach(t => {
            const qIds = State.globalQuestions.filter(q => q.topic === t).map(q => q.id);
            const attemptedInUnit = qIds.filter(id => stats[id]);
            let uT = 0, uW = 0;
            attemptedInUnit.forEach(id => { uT += stats[id].t; uW += stats[id].w; });
            unitStats[t] = { acc: uT > 0 ? ((uT - uW) / uT * 100) : 0, prog: (attemptedInUnit.length / qIds.length * 100) };
        });

        if (State.charts.unit) State.charts.unit.destroy();
        State.charts.unit = new Chart(document.getElementById('unitChart'), {
            type: 'radar',
            data: {
                labels: topics.map(t => t.length > 8 ? t.substring(0, 8) + '...' : t),
                datasets: [
                    { label: '正確率 (%)', data: topics.map(t => unitStats[t].acc), borderColor: '#4caf87', backgroundColor: 'rgba(76,175,135,0.2)', pointBackgroundColor: '#4caf87' },
                    { label: '完成度 (%)', data: topics.map(t => unitStats[t].prog), borderColor: '#7c6dfa', backgroundColor: 'rgba(124,109,250,0.2)', pointBackgroundColor: '#7c6dfa' }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: '#2d3148' }, angleLines: { color: '#2d3148' }, pointLabels: { color: '#7a7e9a', font: { size: 10 } } } },
                plugins: { legend: { position: 'bottom', labels: { color: '#7a7e9a', boxWidth: 12 } } }
            }
        });

        const sortedData = attemptedIds
            .map(id => {
                const s = stats[id];
                return { id, rate: (s.w / s.t * 100), q: State.globalQuestions.find(i => i.id === id) };
            })
            .sort((a, b) => b.rate - a.rate).slice(0, 10);

        if (State.charts.risk) State.charts.risk.destroy();
        State.charts.risk = new Chart(document.getElementById('riskChart'), {
            type: 'bar',
            data: { labels: sortedData.map(d => d.id), datasets: [{ label: '錯誤率 (%)', data: sortedData.map(d => d.rate), backgroundColor: sortedData.map(d => d.rate > 70 ? '#e05c6e' : '#f59e0b'), borderRadius: 5 }] },
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { color: '#7a7e9a' }, grid: { color: '#2d3148' } }, y: { ticks: { color: '#7a7e9a' }, grid: { display: false } } } }
        });

        document.getElementById('full-analysis-list').innerHTML = attemptedIds
            .map(id => ({ id, rate: (stats[id].w / stats[id].t * 100), ...stats[id], text: State.globalQuestions.find(i => i.id === id)?.question || id }))
            .sort((a, b) => b.rate - a.rate)
            .map(item => `
                <div class="flex-between" style="padding:12px; border-bottom:1px solid var(--border);">
                    <div style="flex:1;">
                        <div style="font-weight:700; color:var(--accent); font-size:0.8rem;">${item.id} <span style="font-weight:normal; color:var(--muted); font-size:0.7rem;">(錯 ${item.w} / 共 ${item.t})</span></div>
                        <div style="font-size:0.9rem; margin-top:4px; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.text}</div>
                    </div>
                    <div style="text-align:right; margin-left:16px; min-width:80px;">
                        <div style="color:${item.rate > 50 ? 'var(--wrong)' : 'var(--correct)'}; font-weight:700; font-size:1rem;">${Math.round(item.rate)}%</div>
                    </div>
                </div>
            `).join('');
    }
};
