(function(){
  var CONSENT_NAME = 'pl_cookie_consent';
  var CONSENT_DAYS = 180;

  var readConsent = function(){
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(CONSENT_NAME + '=') === 0) return decodeURIComponent(parts[i].split('=')[1]);
    }
    return '';
  };

  var writeConsent = function(value){
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = CONSENT_NAME + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=' + (CONSENT_DAYS * 24 * 60 * 60) + '; SameSite=Lax' + secure;
  };

  var b = document.querySelector('.burger'), d = document.getElementById('drawer'), n = document.querySelector('.nav');
  if (b && d) {
    b.addEventListener('click', function(){
      var open = document.body.classList.toggle('nav-open');
      b.setAttribute('aria-expanded', String(open));
      b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      d.style.top = n.getBoundingClientRect().bottom + 'px';
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  try {
    var q = new URLSearchParams(location.search).get('interest');
    if (q) {
      document.querySelectorAll('[data-interest]').forEach(function(s){
        for (var i = 0; i < s.options.length; i++) {
          if (s.options[i].text.toLowerCase() === q.toLowerCase()) s.selectedIndex = i;
        }
      });
    }
  } catch (e) {}

  document.querySelectorAll('form[data-formspree]').forEach(function(f){
    f.addEventListener('submit', function(e){
      if (!window.fetch) return;
      e.preventDefault();
      var btn = f.querySelector('button[type=submit]'), txt = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending...';
      var old = f.querySelector('.form-err');
      if (old) old.remove();
      fetch(f.action, {method: 'POST', body: new FormData(f), headers: {'Accept': 'application/json'}}).then(function(r){
        if (r.ok) {
          try {
            var fd = new FormData(f);
            sessionStorage.setItem('pl_lead', JSON.stringify({name: fd.get('name') || '', email: fd.get('email') || ''}));
          } catch (err) {}
          location.href = f.getAttribute('data-next');
        } else {
          throw 0;
        }
      }).catch(function(){
        btn.disabled = false;
        btn.textContent = txt;
        var p = document.createElement('p');
        p.className = 'form-err';
        p.textContent = 'Sorry, something went wrong. Please email info@PhilippineLeads.com.';
        f.appendChild(p);
      });
    });
  });

  var cal = document.getElementById('calendly');
  var calStarted = false;

  var showCalFallback = function(){
    if (!cal) return;
    cal.hidden = true;
    var note = document.getElementById('cal-fallback');
    if (note) {
      note.hidden = false;
      return;
    }
    note = document.createElement('div');
    note.id = 'cal-fallback';
    note.className = 'cal-fallback';
    var p = document.createElement('p');
    p.textContent = 'The booking calendar is provided by Calendly and uses scheduling cookies. Allow them to load it here, or open the calendar in a new tab.';
    var actions = document.createElement('div');
    actions.className = 'btns';
    var allow = document.createElement('button');
    allow.type = 'button';
    allow.className = 'btn btn-p';
    allow.textContent = 'Allow and load calendar';
    allow.addEventListener('click', function(){ saveConsent('all'); });
    var open = document.createElement('a');
    open.className = 'btn btn-ol';
    open.href = cal.getAttribute('data-url');
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = 'Open the calendar';
    actions.appendChild(allow);
    actions.appendChild(open);
    note.appendChild(p);
    note.appendChild(actions);
    cal.parentNode.insertBefore(note, cal);
  };

  var startCalendly = function(){
    if (!cal || calStarted) return;
    if (readConsent() !== 'all') {
      showCalFallback();
      return;
    }
    calStarted = true;
    cal.hidden = false;
    var note = document.getElementById('cal-fallback');
    if (note) note.hidden = true;
    var lead = {};
    try { lead = JSON.parse(sessionStorage.getItem('pl_lead') || '{}'); } catch (e) {}
    var url = cal.getAttribute('data-url') + '?hide_gdpr_banner=1&primary_color=6d28d9';
    var mount = function(tries){
      if (window.Calendly) {
        cal.innerHTML = '';
        Calendly.initInlineWidget({url: url, parentElement: cal, prefill: {name: lead.name || '', email: lead.email || ''}});
        return;
      }
      if (tries < 100) setTimeout(function(){ mount(tries + 1); }, 100);
    };
    if (!document.querySelector('script[data-calendly]')) {
      var s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      s.setAttribute('data-calendly', '');
      s.addEventListener('load', function(){ mount(0); });
      document.body.appendChild(s);
    } else {
      mount(0);
    }
  };

  if (cal) {
    window.addEventListener('message', function(e){
      if (e.origin.indexOf('calendly.com') > -1 && e.data && e.data.event === 'calendly.event_scheduled') {
        if (window.dataLayer) dataLayer.push({event: 'booking_complete'});
        location.href = cal.getAttribute('data-booked');
      }
    });
    startCalendly();
  }

  var banner = document.createElement('div');
  banner.className = 'cookie';
  banner.id = 'cookie-notice';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'cookie-title');
  banner.setAttribute('aria-describedby', 'cookie-desc');
  banner.hidden = true;
  banner.innerHTML = '<div class="cookie-card"><h2 id="cookie-title">Cookies on this site</h2><p id="cookie-desc">We store one necessary cookie to remember your choice. Scheduling cookies from Calendly load only if you accept, and only when you book a call. This site does not use advertising or analytics cookies.</p><div class="cookie-actions"><button type="button" class="btn btn-p" id="cookie-accept">Accept</button><button type="button" class="btn btn-ol" id="cookie-reject">Reject</button><a href="/privacy-policy/#cookies">Cookie details</a></div></div>';
  document.body.appendChild(banner);

  var showBanner = function(moveFocus){
    banner.hidden = false;
    if (!moveFocus) return;
    var accept = document.getElementById('cookie-accept');
    if (accept) accept.focus();
  };

  var saveConsent = function(value){
    writeConsent(value);
    banner.hidden = true;
    if (value === 'all') startCalendly();
    else if (cal) {
      calStarted = false;
      cal.innerHTML = '';
      showCalFallback();
    }
  };

  document.getElementById('cookie-accept').addEventListener('click', function(){ saveConsent('all'); });
  document.getElementById('cookie-reject').addEventListener('click', function(){ saveConsent('necessary'); });
  document.addEventListener('click', function(e){
    var trigger = e.target.closest('[data-cookie-settings]');
    if (!trigger) return;
    e.preventDefault();
    showBanner(true);
  });

  if (!readConsent()) showBanner(false);

  var y = document.getElementById('yr');
  if (y) y.textContent = new Date().getFullYear();
})();
