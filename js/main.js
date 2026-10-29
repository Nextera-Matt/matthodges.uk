/* ===== Matt Hodges Portfolio - Main JavaScript ===== */
/* Patched: XSS fixes, reduced-motion improvements, enhanced terminal commands */

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Header scroll effect
const header = document.getElementById('header');
const scrollHint = document.querySelector('.scroll-hint');

if (header) {
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    header.classList.toggle('scrolled', currentScroll > 50);
    if (scrollHint && currentScroll > 100) {
      scrollHint.classList.add('hidden');
    }
  }, { passive: true });
}

// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', isOpen);
});

// Close menu when clicking a link
nav?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// Scroll animations
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.fade-up, .stagger').forEach(el => observer.observe(el));
} else {
  document.querySelectorAll('.fade-up, .stagger').forEach(el => el.classList.add('visible'));
}

// Contact form
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');

if (form && statusEl) {
  function setStatus(type, msg) {
    statusEl.className = 'form-status ' + (type === 'ok' ? 'ok' : 'err');
    statusEl.textContent = msg;
  }

  form.addEventListener('submit', async (e) => {
    const honey = form.querySelector('#website');
    if (honey?.value) {
      e.preventDefault();
      setStatus('ok', "Thanks! I'll get back to you shortly.");
      form.reset();
      return;
    }

    if (!form.checkValidity()) {
      e.preventDefault();
      setStatus('err', 'Please complete all required fields.');
      form.querySelector(':invalid')?.focus();
      return;
    }

    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7-10H2m20 0h-3m-2.5-6.5L15 7m-6 10l-1.5 1.5m0-13L9 7m6 10l1.5 1.5"/></svg> Sending...';

    try {
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        website: formData.get('website') || ''
      };
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus('ok', "Thanks! I'll get back to you shortly.");
        form.reset();
        btn.classList.add('sent');
        btn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><path d="M20 6L9 17l-5-5"/></svg> Delivered';
        setTimeout(() => {
          btn.classList.remove('sent');
          btn.disabled = false;
          btn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> Send message';
        }, 3500);
        return;
      } else {
        let data = null; try { data = await res.json(); } catch {}
        setStatus('err', (data && data.detail) || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setStatus('err', 'Network error — please try again or email me directly.');
    }

    btn.disabled = false;
    btn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> Send message';
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== Animated Stats =====
const statValues = document.querySelectorAll('.stat-value[data-count], .stat-value[data-text]');
if (statValues.length > 0) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (prefersReducedMotion) {
          if (el.dataset.count) {
            el.textContent = el.dataset.count + (el.dataset.suffix || '');
          } else if (el.dataset.text) {
            el.textContent = el.dataset.text;
          }
        } else if (el.dataset.count) {
          const target = parseInt(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const duration = 1500;
          const start = performance.now();

          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            el.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        } else if (el.dataset.text) {
          const text = el.dataset.text;
          el.textContent = '';
          let i = 0;
          const typeInterval = setInterval(() => {
            el.textContent += text[i];
            i++;
            if (i >= text.length) clearInterval(typeInterval);
          }, 100);
        }
        statsObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statValues.forEach(el => statsObserver.observe(el));
}

// ===== Interactive Terminal =====
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');
const terminal = document.getElementById('terminal');

if (terminalInput && terminalOutput && terminal) {
  const startTime = Date.now();
  const commandHistory = [];
  let historyIndex = -1;

  // SECURITY: Escape all user input before inserting into innerHTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const commands = {
    help: () => [
      'Available commands:',
      '  <span class="terminal-highlight">whoami</span>     - About me',
      '  <span class="terminal-highlight">skills</span>     - Tech stack',
      '  <span class="terminal-highlight">projects</span>   - Featured work',
      '  <span class="terminal-highlight">stats</span>      - Production metrics',
      '  <span class="terminal-highlight">top</span>        - Running services',
      '  <span class="terminal-highlight">contact</span>    - Get in touch',
      '  <span class="terminal-highlight">uptime</span>     - Session uptime',
      '  <span class="terminal-highlight">fortune</span>    - Infrastructure wisdom',
      '  <span class="terminal-highlight">neofetch</span>   - System info',
      '  <span class="terminal-highlight">cv</span>         - Download CV',
      '  <span class="terminal-highlight">clear</span>      - Clear terminal',
      '  <span class="terminal-highlight">sudo hire matt</span> - \u{1F609}'
    ],
    whoami: () => [
      'Matt Hodges',
      '\u251C\u2500 Role: Systems Administrator at Fixter',
      '\u251C\u2500 Location: United Kingdom',
      '\u251C\u2500 Focus: Linux, automation, access, reliability',
      '\u2514\u2500 Previously: Cloud & Infrastructure Engineer, THG Ingenuity'
    ],
    skills: () => [
      'Tech Stack:',
      '\u251C\u2500 Systems:    Linux (RHEL, Rocky, AlmaLinux, Ubuntu), cPanel/WHM',
      '\u251C\u2500 Monitoring: Zabbix, Nagios, Grafana, VictorOps',
      '\u251C\u2500 Automation: Ansible, StackStorm, Bash, Python, PHP',
      '\u251C\u2500 Platforms:  VMware, vCloud Director, OpenStack',
      '\u251C\u2500 Networking: DNS, SSL/TLS, iptables, nftables',
      '\u2514\u2500 Tools:      Git, Docker, Nginx, Apache, SQLite'
    ],
    projects: () => [
      'Featured Projects:',
      '  <a href="/projects/support-dashboard" class="terminal-link">support-dashboard</a>  - Unified ticket aggregation (production)',
      '  <a href="/projects/vip-alerting" class="terminal-link">vip-alerting</a>       - 24/7 critical client escalation',
      '  <a href="/projects/zabbix-automation" class="terminal-link">zabbix-automation</a>  - Automated agent deployment (500+)',
      '  <a href="/projects/pingdom-zabbix" class="terminal-link">pingdom-zabbix</a>     - Unified monitoring integration',
      '',
      'Run: <span class="terminal-highlight">open projects</span> to view all'
    ],
    stats: () => [
      '<span class="terminal-highlight">Production Metrics:</span>',
      '',
      '  Servers automated       <span class="terminal-success">500+</span>',
      '  Ticketing platforms      <span class="terminal-success">3</span> (ICS, VPS, Zoho)',
      '  VIP clients monitored    <span class="terminal-success">19</span>',
      '  Callout tiers            <span class="terminal-success">4</span> (VIP, Priority, Keyword, Watched)',
      '  Cache performance        <span class="terminal-success">40x</span> improvement',
      '  DR replication           <span class="terminal-success">60s</span> (LON \u2194 SLC)',
      '  OOH incidents/week       <span class="terminal-success">5-10</span>'
    ],
    top: () => [
      '<span class="terminal-highlight">PID   SERVICE                  STATE      UPTIME</span>',
      '001   support-dashboard        <span class="terminal-success">RUNNING</span>    456d 12h',
      '002   vip-callout-automation   <span class="terminal-success">RUNNING</span>    389d 08h',
      '003   zabbix-agent-deployer    <span class="terminal-success">RUNNING</span>    312d 15h',
      '004   dr-replication (LON\u2192SLC) <span class="terminal-success">RUNNING</span>    290d 03h',
      '005   mailchimp-comms          <span class="terminal-success">RUNNING</span>    245d 19h',
      '006   zoho-salesiq-bot         <span class="terminal-success">RUNNING</span>    198d 07h',
      '',
      'Load avg: 0.42, 0.38, 0.35  |  Mem: 2.1G / 4.0G  |  Tasks: 6 running'
    ],
    fortune: () => {
      const quotes = [
        '"It\'s always DNS." \u2014 Every engineer who has ever lived.',
        '"Have you tried turning it off and on again?" \u2014 The universal fix since 1952.',
        '"It works on my machine." \u2014 Famous last words, usually said on a Friday.',
        '"There are only two hard things: cache invalidation, naming things, and off-by-one errors."',
        '"The best monitoring alert is the one that wakes someone else up."',
        '"Uptime is just the time between incidents you haven\'t noticed yet."',
        '"A server is just someone else\'s computer having a bad day."',
        '"Backups are useless. Restores are priceless."',
        '"If it\'s stupid but it works, it\'s not stupid \u2014 it\'s production."',
        '"The cloud is just someone else\'s data centre on fire."',
        '"chmod 777: the duct tape of Linux permissions."',
        '"Documentation is like a love letter to your future self."',
        '"There is no cloud. There is only someone else\'s computer in a building you\'ve never seen."',
        '"Premature optimisation is the root of all evil. But so is a 40-second page load."',
      ];
      return [quotes[Math.floor(Math.random() * quotes.length)]];
    },
    contact: () => [
      'Get in touch:',
      '  Email:    <a href="mailto:contact@matthodges.uk" class="terminal-link">contact@matthodges.uk</a>',
      '  GitHub:   <a href="https://github.com/Nextera-Matt" target="_blank" class="terminal-link">github.com/Nextera-Matt</a>',
      '  LinkedIn: <a href="https://www.linkedin.com/in/matt-hodges-7b0642192/" target="_blank" class="terminal-link">linkedin.com/in/matt-hodges</a>',
      '',
      'Or scroll down to the contact form \u{1F447}'
    ],
    uptime: () => {
      const elapsed = Date.now() - startTime;
      const seconds = Math.floor(elapsed / 1000) % 60;
      const minutes = Math.floor(elapsed / 60000) % 60;
      const hours = Math.floor(elapsed / 3600000);
      return [
        `Session uptime: ${hours}h ${minutes}m ${seconds}s`,
        'Site status: <span class="terminal-success">\u25CF All systems operational</span>'
      ];
    },
    cv: () => {
      window.open('/files/Matt_Hodges_CV.pdf', '_blank');
      return ['<span class="terminal-success">\u2713 Opening CV in new tab...</span>'];
    },
    clear: () => {
      terminalOutput.innerHTML = '';
      return [];
    },
    'sudo hire matt': () => ({
      special: 'dramatic',
      lines: [
        '<span class="terminal-success">Access granted.</span>',
        'Initiating hire sequence...',
        '\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 100%',
        '',
        '\u2713 CV downloaded to your brain',
        '\u2713 Interview scheduled: Now',
        '\u2713 Offer letter: Pending your signature',
        '',
        'Just kidding \u2014 but <a href="#contact" class="terminal-link">let\'s talk</a>! \u{1F680}'
      ]
    }),
    'open projects': () => {
      window.location.href = '/projects';
      return ['<span class="terminal-success">Navigating to projects...</span>'];
    },
    'rm -rf /': () => [
      '<span class="terminal-error">Permission denied.</span>',
      'Nice try. I just paged the on-call engineer. \u{1F6A8}'
    ],
    'rm -rf': () => [
      '<span class="terminal-error">Permission denied.</span>',
      'Nice try. I just paged the on-call engineer. \u{1F6A8}'
    ],
    shutdown: () => [
      '<span class="terminal-error">Permission denied.</span>',
      'You need to be root for that. And no, I\'m not giving you root.'
    ],
    reboot: () => [
      '<span class="terminal-error">Permission denied.</span>',
      'Did you file a change request first?'
    ],
    vim: () => [
      'Opening vim...',
      '',
      '<span class="terminal-error">Just kidding. Nobody knows how to exit vim.</span>',
      'Type <span class="terminal-highlight">:q!</span> to escape. Or just close the tab.'
    ],
    ls: () => ['about.txt  projects/  skills.json  contact.md  cv.pdf  .bash_history  .vimrc'],
    pwd: () => ['/home/visitor/matthodges.uk'],
    date: () => [escapeHtml(new Date().toString())],
    hostname: () => ['portfolio.matthodges.uk'],
    id: () => ['uid=1000(visitor) gid=1000(visitor) groups=1000(visitor),100(users)'],
    uname: () => ['Linux portfolio.matthodges.uk 5.14.0-362.el9.x86_64 #1 SMP x86_64 GNU/Linux'],
    whoami_system: () => ['visitor'],
    free: () => [
      '              total    used    free   shared  buff/cache  available',
      'Mem:          4096    2148     984      128     964        1720',
      'Swap:         2048       0    2048'
    ],
    df: () => [
      'Filesystem     Size  Used Avail Use% Mounted on',
      '/dev/vda1       40G   12G   26G  32% /',
      '/dev/vdb1      100G   67G   28G  71% /home'
    ],
    // FIX: Escape user input in echo to prevent XSS
    echo: (args) => [escapeHtml(args.join(' ')) || ''],
    // FIX: Escape user input in ping to prevent XSS
    ping: (args) => {
      const host = escapeHtml(args[0] || 'matthodges.uk');
      return [
        `PING ${host}:`,
        '64 bytes: time=<span class="terminal-success">fast</span> \u2713',
        '64 bytes: time=<span class="terminal-success">fast</span> \u2713',
        '64 bytes: time=<span class="terminal-success">fast</span> \u2713',
        `--- ${host} ping statistics ---`,
        '3 packets transmitted, 3 received, 0% packet loss'
      ];
    },
    ssh: (args) => {
      const host = escapeHtml(args[0] || '');
      if (!host) return ['<span class="terminal-error">ssh: missing destination</span>'];
      return [
        `Connecting to ${host}...`,
        '<span class="terminal-error">Connection refused.</span>',
        'Nice try though.'
      ];
    },
    curl: (args) => {
      const url = escapeHtml(args[0] || '');
      if (!url) return ['<span class="terminal-error">curl: missing URL</span>'];
      return [
        `<span class="terminal-highlight">HTTP/1.1 200 OK</span>`,
        'Server: nginx',
        'Content-Type: application/json',
        '',
        '{"status":"ok","message":"Looking for my API? Check my projects."}'
      ];
    },
    wget: () => [
      '<span class="terminal-error">wget: not permitted</span>',
      'You can download my CV with the <span class="terminal-highlight">cv</span> command though.'
    ],
    // FIX: Escape user input in cat to prevent XSS
    cat: (args) => {
      const file = args[0];
      if (!file) return ['<span class="terminal-error">cat: missing file operand</span>'];
      const safeFile = escapeHtml(file);
      const files = {
        'about.txt': [
          'Matt Hodges - Systems Administrator at Fixter',
          'Infrastructure, access, and automation. Moving into DevOps.',
          'Previously Cloud & Infrastructure Engineer at THG Ingenuity.',
          '',
          'Six years there, from infrastructure apprentice to L3.'
        ],
        'skills.json': [
          '{',
          '  "systems": ["Linux", "RHEL", "Rocky", "AlmaLinux"],',
          '  "automation": ["Ansible", "StackStorm", "Bash", "Python", "PHP"],',
          '  "monitoring": ["Zabbix", "Nagios", "VictorOps", "Grafana"],',
          '  "platforms": ["VMware", "OpenStack", "vCloud Director"],',
          '  "tools": ["Git", "Docker", "Nginx", "Apache", "SQLite"]',
          '}'
        ],
        'contact.md': [
          '# Contact',
          '',
          'Email: contact@matthodges.uk',
          'GitHub: github.com/Nextera-Matt',
          'LinkedIn: linkedin.com/in/matt-hodges-7b0642192'
        ],
        '.bash_history': [
          'ansible-playbook deploy-zabbix.yml --limit production',
          'tail -f /var/log/vip-to-vo.log',
          'systemctl status dashboard',
          'curl -s https://dashboard.internal/api/health | jq .',
          'vim /etc/zabbix/zabbix_agentd.conf',
          'rsync -avz --progress /var/www/dashboard/ slc-backup:dashboard/',
        ],
        '.vimrc': [
          'set number',
          'set relativenumber',
          'syntax on',
          'set tabstop=4',
          'set shiftwidth=4',
          'set expandtab',
          '" I actually use nano, don\'t tell anyone'
        ]
      };
      return files[file] || [`<span class="terminal-error">cat: ${safeFile}: No such file</span>`];
    },
    neofetch: () => [
      '        .--.         <span class="terminal-highlight">matt</span>@<span class="terminal-highlight">portfolio</span>',
      '       |o_o |        \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
      '       |:_/ |        OS: Rocky Linux 9',
      '      //   \\\\ \\\\       Host: OVH VPS',
      '     (|     | )      Uptime: 99.9%',
      '    /\'\\\\_   _/`\\\\      Shell: bash 5.2',
      '    \\\\___)=(___/      Theme: Dark Mode',
      '                     Packages: too many to count',
      '                     Memory: 2.1G / 4.0G'
    ],
    matrix: () => ({
      special: 'dramatic',
      lines: [
        '<span class="terminal-success">Wake up, Neo...</span>',
        'The Matrix has you...',
        'Follow the white rabbit. \u{1F407}',
        '',
        'Or just type <span class="terminal-highlight">help</span>. That works too.'
      ]
    }),
    exit: () => [
      '<span class="terminal-error">logout</span>',
      'Connection to matthodges.uk closed.',
      '',
      '...just kidding, you\'re stuck here. \u{1F604}'
    ],
    history: () => {
      if (commandHistory.length === 0) return ['No commands in history yet.'];
      const recent = commandHistory.slice(0, 10).reverse();
      return recent.map((cmd, i) => `  ${i + 1}  ${escapeHtml(cmd)}`);
    },
    welcome: () => [
      'Hey! I\'m Matt \u2014 Systems Administrator at Fixter, moving into DevOps.',
      '',
      'Before that, six years at THG Ingenuity building internal tooling.',
      'Type <span class="terminal-highlight">help</span> to see available commands.'
    ]
  };

  // Aliases
  commands.man = commands.help;
  commands['?'] = commands.help;
  commands.about = commands.whoami;
  commands.me = commands.whoami;
  commands.stack = commands.skills;
  commands.tech = commands.skills;
  commands.work = commands.projects;
  commands.email = commands.contact;
  commands.hire = () => commands['sudo hire matt']();
  commands.resume = commands.cv;
  commands.cls = commands.clear;
  commands.htop = commands.top;
  commands.ps = commands.top;
  commands['sudo rm -rf /'] = commands['rm -rf /'];
  commands['sudo rm -rf'] = commands['rm -rf'];

  function addOutput(lines, isCommand = false, cmdText = '', mode = 'auto') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useTypewriter = !prefersReducedMotion && mode === 'auto'
      ? (lines.length <= 3 && lines.join('').length < 150)
      : false;
    const isDramatic = !prefersReducedMotion && mode === 'dramatic';

    if (isCommand) {
      const cmdLine = document.createElement('div');
      cmdLine.className = 'terminal-line';
      cmdLine.innerHTML = `<span class="terminal-prompt">$</span><span class="terminal-cmd">${escapeHtml(cmdText)}</span>`;
      terminalOutput.appendChild(cmdLine);
    }

    // If reduced motion, just dump all lines immediately
    if (prefersReducedMotion) {
      lines.forEach(line => {
        const outputLine = document.createElement('div');
        outputLine.className = 'terminal-line terminal-output';
        outputLine.innerHTML = line;
        terminalOutput.appendChild(outputLine);
      });
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
      return;
    }

    setTimeout(() => {
      if (isDramatic) {
        let lineIndex = 0;

        function typeLineSlowly(line, callback) {
          const outputLine = document.createElement('div');
          outputLine.className = 'terminal-line terminal-output';
          terminalOutput.appendChild(outputLine);

          if (line.includes('<a ')) {
            outputLine.style.opacity = '0';
            outputLine.innerHTML = line;
            setTimeout(() => {
              outputLine.style.transition = 'opacity 0.3s ease';
              outputLine.style.opacity = '1';
              callback();
            }, 50);
            return;
          }

          outputLine.innerHTML = '';
          let charIndex = 0;

          function typeChar() {
            const remaining = line.slice(charIndex);
            const tagMatch = remaining.match(/^<[^>]+>/);

            if (tagMatch) {
              outputLine.innerHTML += tagMatch[0];
              charIndex += tagMatch[0].length;
            } else if (remaining.length > 0) {
              outputLine.innerHTML += remaining[0];
              charIndex++;
            }

            terminalOutput.scrollTop = terminalOutput.scrollHeight;

            if (charIndex < line.length) {
              setTimeout(typeChar, 25 + Math.random() * 15);
            } else {
              callback();
            }
          }

          if (line === '') {
            callback();
          } else {
            typeChar();
          }
        }

        function nextLine() {
          if (lineIndex >= lines.length) return;
          const line = lines[lineIndex];
          lineIndex++;

          const pauseBefore = line.startsWith('\u2713') ? 300 : (line === '' ? 100 : 200);

          setTimeout(() => {
            typeLineSlowly(line, nextLine);
          }, pauseBefore);
        }

        nextLine();

      } else if (useTypewriter) {
        let lineIndex = 0;
        let charIndex = 0;
        let currentLine = null;

        function typeNext() {
          if (lineIndex >= lines.length) return;

          if (charIndex === 0) {
            currentLine = document.createElement('div');
            currentLine.className = 'terminal-line terminal-output';
            currentLine.innerHTML = '';
            terminalOutput.appendChild(currentLine);
          }

          const fullLine = lines[lineIndex];
          const remaining = fullLine.slice(charIndex);
          const tagMatch = remaining.match(/^<[^>]+>/);

          if (tagMatch) {
            currentLine.innerHTML += tagMatch[0];
            charIndex += tagMatch[0].length;
          } else if (remaining.length > 0) {
            currentLine.innerHTML += remaining[0];
            charIndex++;
          }

          terminalOutput.scrollTop = terminalOutput.scrollHeight;

          if (charIndex >= fullLine.length) {
            lineIndex++;
            charIndex = 0;
            if (lineIndex < lines.length) {
              setTimeout(typeNext, 80);
            }
          } else {
            setTimeout(typeNext, 15 + Math.random() * 20);
          }
        }
        typeNext();
      } else {
        lines.forEach((line, i) => {
          setTimeout(() => {
            const outputLine = document.createElement('div');
            outputLine.className = 'terminal-line terminal-output terminal-fade';
            outputLine.innerHTML = line;
            terminalOutput.appendChild(outputLine);
            outputLine.offsetHeight;
            outputLine.classList.add('visible');
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
          }, i * 60);
        });
      }
    }, 150);
  }

  function processCommand(input) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;

    commandHistory.unshift(input);
    historyIndex = -1;

    // Check for exact match first (for multi-word commands)
    if (commands[trimmed]) {
      const result = typeof commands[trimmed] === 'function' ? commands[trimmed]([]) : commands[trimmed];
      if (result && result.special === 'dramatic') {
        addOutput(result.lines, true, input, 'dramatic');
      } else {
        addOutput(result, true, input);
      }
      return;
    }

    // Parse command and args
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    if (commands[cmd]) {
      const result = typeof commands[cmd] === 'function' ? commands[cmd](args) : commands[cmd];
      if (result && result.special === 'dramatic') {
        addOutput(result.lines, true, input, 'dramatic');
      } else {
        addOutput(result, true, input);
      }
    } else {
      addOutput([`<span class="terminal-error">Command not found: ${escapeHtml(cmd)}</span>`, 'Type <span class="terminal-highlight">help</span> for available commands.'], true, input);
    }
  }

  terminalInput.addEventListener('keydown', (e) => {
    terminal.classList.add('has-input');

    if (e.key === 'Enter') {
      processCommand(terminalInput.value);
      terminalInput.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        terminalInput.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        terminalInput.value = commandHistory[historyIndex];
      } else {
        historyIndex = -1;
        terminalInput.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const partial = terminalInput.value.trim().toLowerCase();
      if (partial) {
        const matches = Object.keys(commands).filter(c => c.startsWith(partial) && !c.includes(' '));
        if (matches.length === 1) {
          terminalInput.value = matches[0];
        } else if (matches.length > 1) {
          addOutput(['Suggestions: ' + matches.slice(0, 5).map(m => `<span class="terminal-highlight">${m}</span>`).join(', ')], false);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    }
  });

  // Focus terminal on click and hide scroll hint
  terminal.addEventListener('click', () => {
    terminalInput.focus();
    if (scrollHint) scrollHint.classList.add('hidden');
  });
}
