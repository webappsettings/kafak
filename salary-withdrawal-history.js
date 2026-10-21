// Read-only navigation; no withdrawal or salary balance is changed.
window.mountSalaryWithdrawalHistory = function (partners) {
    document.querySelectorAll('#partner-list .partner-card').forEach(card => {
        const data = partners[card.dataset.partner];
        const rows = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
        const host = card.querySelector('.salary-withdrawal-history');
        if (!host || !rows.length) return;
        host.replaceChildren();
        host.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;font-size:11px;margin-top:8px';
        host.addEventListener('click', e => e.stopPropagation());
        let index = 0;
        const older = document.createElement('button'), newer = document.createElement('button');
        const label = document.createElement('span');
        label.setAttribute('aria-live', 'polite');
        for (const [button, text, title] of [[older,'←','Previous withdrawal'],[newer,'→','Next withdrawal']]) {
            button.type='button'; button.textContent=text; button.title=title;
            button.setAttribute('aria-label',title);
            button.className='btn btn-sm btn-outline-secondary';
            button.style.cssText='min-width:36px;min-height:36px;padding:3px 8px';
        }
        const render = () => {
            const row=rows[index];
            label.textContent=(index===0?'Last Taken: ':'Taken: ')+'₹'+Number(row.amount).toLocaleString('en-IN',{maximumFractionDigits:2})+' ('+row.date+') · '+(index+1)+'/'+rows.length;
            older.disabled=index===rows.length-1; newer.disabled=index===0;
        };
        older.onclick=()=>{if(index<rows.length-1){index++;render();}};
        newer.onclick=()=>{if(index>0){index--;render();}};
        host.append(older,label,newer); render();
    });
};
