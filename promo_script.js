// Mock Script for Screenshots
document.addEventListener('DOMContentLoaded', () => {
    // Mock Tabs
    const tabs = [
        { title: 'Google - Smart Tab Booker', url: 'https://google.com', icon: 'https://www.google.com/s2/favicons?domain=google.com' },
        { title: 'GitHub - antigravity/smart-tab-booker', url: 'https://github.com', icon: 'https://github.githubassets.com/favicons/favicon.svg' },
        { title: 'Stack Overflow - Chrome Extension APIs', url: 'https://stackoverflow.com', icon: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico' },
        { title: 'MDN Web Docs - Service Worker', url: 'https://developer.mozilla.org', icon: 'https://developer.mozilla.org/favicon.ico' },
        { title: 'YouTube - LoFi Radio', url: 'https://youtube.com', icon: 'https://www.youtube.com/s/desktop/1cd61247/img/favicon.ico' }
    ];

    const tabListContainer = document.getElementById('tabListContainer');

    // --- Control Header ---
    const controlDiv = document.createElement('div');
    controlDiv.style.display = 'flex';
    controlDiv.style.justifyContent = 'space-between';
    controlDiv.style.alignItems = 'center';
    controlDiv.style.marginBottom = '8px';
    controlDiv.style.borderBottom = '1px solid #ccc';
    controlDiv.style.paddingBottom = '5px';

    const btnGroup = document.createElement('div');
    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = "Select All";
    selectAllBtn.className = 'link-btn';
    selectAllBtn.style.background = 'none';
    selectAllBtn.style.border = 'none';
    selectAllBtn.style.color = '#007bff';
    selectAllBtn.style.cursor = 'pointer';
    selectAllBtn.style.padding = '0 5px 0 0';
    selectAllBtn.style.fontSize = '12px';

    const separator = document.createTextNode('|');

    const deselectAllBtn = document.createElement('button');
    deselectAllBtn.textContent = "Deselect All";
    deselectAllBtn.style.background = 'none';
    deselectAllBtn.style.border = 'none';
    deselectAllBtn.style.color = '#007bff';
    deselectAllBtn.style.cursor = 'pointer';
    deselectAllBtn.style.padding = '0 0 0 5px';
    deselectAllBtn.style.fontSize = '12px';

    btnGroup.appendChild(selectAllBtn);
    btnGroup.appendChild(separator);
    btnGroup.appendChild(deselectAllBtn);

    const counterSpan = document.createElement('span');
    counterSpan.style.fontSize = '12px';
    counterSpan.style.fontWeight = 'bold';
    counterSpan.textContent = "Selected: 5 / 5";

    controlDiv.appendChild(btnGroup);
    controlDiv.appendChild(counterSpan);
    tabListContainer.appendChild(controlDiv);

    // --- Tab List ---
    const scrollContainer = document.createElement('div');
    scrollContainer.style.maxHeight = '150px';
    scrollContainer.style.overflowY = 'auto';

    tabs.forEach(tab => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.padding = '2px 0';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.style.marginRight = '8px';
        div.appendChild(checkbox);

        if (tab.icon) {
            const img = document.createElement('img');
            img.src = tab.icon;
            img.style.width = '16px';
            img.style.height = '16px';
            img.style.marginRight = '5px';
            div.appendChild(img);
        }

        const label = document.createElement('span');
        label.textContent = tab.title;
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        label.style.fontSize = '12px';
        div.appendChild(label);
        scrollContainer.appendChild(div);
    });

    tabListContainer.appendChild(scrollContainer);

    // Dark Mode Toggle Mock
    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
        if (e.target.checked) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    });

    // Auto Backup Toggle Mock
    document.getElementById('autoBackupToggle').addEventListener('change', (e) => {
        const settings = document.getElementById('autoBackupSettings');
        if (e.target.checked) settings.classList.remove('hidden');
        else settings.classList.add('hidden');
    });

    // Force Dark Mode for Screenshot
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').checked = true;

    // Interval Toggle Mock
    document.getElementById('intervalSelect').addEventListener('change', (e) => {
        const custom = document.getElementById('customIntervalContainer');
        const time = document.getElementById('timeContainer');
        if (e.target.value === 'custom') {
            custom.classList.remove('hidden');
            time.classList.add('hidden');
        } else {
            custom.classList.add('hidden');
            time.classList.remove('hidden');
        }
    });
});
