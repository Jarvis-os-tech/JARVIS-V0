/**
 * J.A.R.V.I.S. Central Brain - Zero-Install Browser Quick-Capture Bookmarklet
 * 
 * HOW TO INSTALL:
 * 1. Create a new bookmark in your browser (Chrome/Brave/Firefox).
 * 2. Set the Name to: "⚡ Ingest into Brain"
 * 3. Paste the minified code below into the URL field.
 * 
 * Clicking it captures the active page title, URL, and any highlighted text,
 * sending it straight to the Central Brain on http://localhost:8200/api/ingest/browser.
 */

/* Raw readable bookmarklet code: */
(function() {
  const title = document.title;
  const url = window.location.href;
  const selectedText = window.getSelection ? window.getSelection().toString() : '';
  const bodySnippet = document.body ? document.body.innerText.slice(0, 3000) : '';

  fetch('http://localhost:8200/api/ingest/browser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
      url: url,
      selectedText: selectedText,
      rawSessionText: bodySnippet,
      toolName: 'Browser Quick-Capture'
    })
  })
  .then(res => res.json())
  .then(data => {
    const toast = document.createElement('div');
    toast.innerText = '⚡ [Central Brain] Ingested into Memory Ledger!';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#065f46';
    toast.style.color = '#34d399';
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '999999';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    toast.style.fontFamily = 'monospace';
    toast.style.fontWeight = 'bold';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  })
  .catch(err => {
    alert('❌ [Central Brain] Could not reach http://localhost:8200. Is Central Brain running?');
  });
})();

/* MINIFIED ONE-LINER FOR BOOKMARK URL:
javascript:(function(){const t=document.title,u=window.location.href,s=window.getSelection?window.getSelection().toString():'',b=document.body?document.body.innerText.slice(0,3000):'';fetch('http://localhost:8200/api/ingest/browser',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t,url:u,selectedText:s,rawSessionText:b,toolName:'Browser Quick-Capture'})}).then(r=>r.json()).then(()=>{const o=document.createElement('div');o.innerText='⚡ [Central Brain] Ingested!';o.style.position='fixed';o.style.bottom='20px';o.style.right='20px';o.style.backgroundColor='#065f46';o.style.color='#34d399';o.style.padding='10px 16px';o.style.borderRadius='8px';o.style.zIndex='999999';o.style.fontFamily='monospace';document.body.appendChild(o);setTimeout(()=>o.remove(),2000);}).catch(()=>alert('❌ [Central Brain] Failed to reach http://localhost:8200'));})();
*/
