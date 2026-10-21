// Read-only navigation; no withdrawal or salary balance is changed.
window.mountSalaryWithdrawalHistory = function (partners) {
    document.querySelectorAll('#partner-list .partner-card').forEach(card => {
        const data = partners[card.dataset.partner];
        const rows = Array.isArray(data?.withdrawals) ? data.withdrawals : [];
        const host = card.querySelector('.salary-withdrawal-history');
        if (!host || !rows.length) return;
        host.replaceChildren();
        host.style.cssText = 'display:grid;grid-template-columns:32px minmax(0,1fr) 32px;align-items:center;gap:6px;font-size:11px;margin-top:10px;width:100%;min-width:0';
        host.addEventListener('click', e => e.stopPropagation());
        let index = 0;
        const older = document.createElement('button'), newer = document.createElement('button');
        const label = document.createElement('span');
        label.setAttribute('aria-live', 'polite'); label.style.cssText='text-align:center;min-width:0;line-height:1.5;overflow-wrap:anywhere';
        for (const [button, text, title] of [[older,'←','Previous withdrawal'],[newer,'→','Next withdrawal']]) {
            button.type='button'; button.textContent=text; button.title=title;
            button.setAttribute('aria-label',title);
            button.className='btn btn-sm btn-outline-secondary';
            button.style.cssText='width:32px!important;min-width:0!important;height:32px!important;min-height:0!important;padding:0!important;font-size:16px!important;line-height:30px!important;border-radius:8px!important';
        }
        const render = () => {
            const row=rows[index];
            const money=value=>'₹'+Number(value).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
            label.replaceChildren();
            const heading=document.createElement('div'), date=document.createElement('div');
            heading.textContent=(row.settlementRecorded?'Settlement: ':row.settledTotal?'Settled total: ':index===0?'Last Taken: ':'Taken: ')+money(row.settledTotal??row.amount);
            heading.style.fontWeight='600';
            date.textContent=row.date+' · '+(index+1)+' / '+rows.length;
            label.append(heading,date);
            if(row.settledTotal){const note=document.createElement('div');note.textContent=row.settlementRecorded?'Old earnings matched · Balance '+money(row.settlementBalance):'Includes earlier payments · Entry: '+money(row.amount);note.style.cssText='font-size:10px;color:#6c757d';label.append(note);}
            older.disabled=index===rows.length-1; newer.disabled=index===0;
        };
        older.onclick=()=>{if(index<rows.length-1){index++;render();}};
        newer.onclick=()=>{if(index>0){index--;render();}};
        host.append(older,label,newer); render();
    });
};
